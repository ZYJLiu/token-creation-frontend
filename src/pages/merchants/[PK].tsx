import { useRouter } from "next/router"
import { useWorkspace } from "contexts/Workspace"
import { useEffect, useState } from "react"
import { PublicKey } from "@solana/web3.js"
import { DisplayPromo } from "../../../src/components/Promo"

import styles from "../../styles/custom.module.css"

export default function Promo() {
    const router = useRouter()
    const { PK } = router.query
    const workspace = useWorkspace()

    const merchant = new PublicKey(PK) || null

    const [accounts, setAccounts] = useState(null)

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
            setAccounts(accounts)
        }
        fetchData()
    }, [PK])

    return (
        <div>
            {accounts && (
                <div className={styles.gridNFT}>
                    {Object.keys(accounts).map((key, index) => {
                        const data = accounts[key]
                        return <DisplayPromo key={key} account={data} />
                    })}
                </div>
            )}
        </div>
    )
}
