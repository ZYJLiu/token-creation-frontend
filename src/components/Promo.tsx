import { FC, useState, useEffect, useRef } from "react"
import { Metaplex } from "@metaplex-foundation/js"
import { useWorkspace } from "contexts/Workspace"
import Modal from "../../src/components/Modal"

export interface PromoProps {
    account: string
}

export const DisplayPromo: FC<PromoProps> = (props) => {
    const [data, setData] = useState(null)
    const [modalData, setModalData] = useState(null)
    const [isOpen, setIsOpen] = useState(false)

    const workspace = useWorkspace()
    const connection = workspace.connection
    const metaplex = new Metaplex(connection)

    const run = useRef(true)
    useEffect(() => {
        const fetchData = async () => {
            const metadata = await metaplex
                .nfts()
                .findByMint(props.account.account.mint)
            let fetchResult = await fetch(metadata.uri)
            let json = await fetchResult.json()
            console.log(json)
            setData(json)
        }
        if (run.current) {
            run.current = false
            fetchData()
        }
    }, [props])

    return (
        <div>
            {data && (
                <div>
                    <img src={data.image} />
                    <ul>{data.name}</ul>
                    <ul>{data.description}</ul>
                    <button
                        className="px-1 m-1 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-200 hover:to-yellow-500 ..."
                        onClick={() => {
                            setModalData(props.account.publicKey)
                            setIsOpen(true)
                        }}
                    >
                        Mint Promo
                    </button>
                    {isOpen && (
                        <Modal
                            data={modalData}
                            open={isOpen}
                            onClose={() => setIsOpen(false)}
                        />
                    )}
                </div>
            )}
        </div>
    )
}
