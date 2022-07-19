import { useRouter } from "next/router"
import { useWorkspace } from "contexts/Workspace"
import { useEffect, useState, useRef } from "react"
import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js"
import { Metaplex } from "@metaplex-foundation/js"

import Modal from "../../../src/components/Modal"

import styles from "../../styles/custom.module.css"

export default function Promo() {
    const router = useRouter()
    const { PK } = router.query
    const workspace = useWorkspace()
    const merchant = new PublicKey(PK)

    const connection = new Connection(clusterApiUrl("devnet"))
    const metaplex = new Metaplex(connection)

    const [promos, setPromos] = useState(null)
    const [nfts, setNfts] = useState(null)

    const [modalData, setModalData] = useState(null)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            const accounts = await workspace.program?.account.promo.all([
                {
                    memcmp: {
                        offset: 8,
                        bytes: merchant.toBase58(),
                    },
                },
            ])

            let mints = []

            Object.keys(accounts).map((key, index) => {
                const data = accounts[key]
                // console.log(data.account.mint)
                mints.push(data.account.mint)
            })

            const nfts = await metaplex.nfts().findAllByMintList(mints)
            setNfts(nfts)
        }
        fetchData()
    }, [PK])

    // fetch URI data for all mints in loop
    const forLoop = async () => {
        let jsonData = []

        if (nfts !== null) {
            // console.log("data", data);
            var index = nfts.length - 1
            for (let i = 0; i < nfts.length; i++) {
                // console.log(data[i].uri);
                let fetchResult = await fetch(nfts[i].uri)
                let json = await fetchResult.json()
                // console.log(json)
                // console.log(index)
                jsonData.push([index, json])
                index -= 1
            }
            setPromos(jsonData)
            console.log(jsonData)
        }

        run.current = true
    }

    const run = useRef(true)
    useEffect(() => {
        if (run.current) {
            run.current = false
            forLoop()
        }
    }, [nfts])

    return (
        <div>
            {promos && (
                <div className={styles.gridNFT}>
                    {promos.map(([index, promo]) => (
                        <div>
                            <ul>{promo.name}</ul>
                            <img src={promo.image} />
                            <button
                                className="px-2 m-1 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-200 hover:to-yellow-500 ..."
                                onClick={() => {
                                    setModalData(index)
                                    setIsOpen(true)
                                }}
                            >
                                Mint Promo
                            </button>
                        </div>
                    ))}
                    <Modal
                        data={modalData}
                        open={isOpen}
                        onClose={() => setIsOpen(false)}
                        wallet={merchant}
                    />
                </div>
            )}
        </div>
    )
}
