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

  const merchant = new PublicKey(
    PK || "HexFnfwS4Rp8abu2Y4EnT44NeQf7KFdVdEhYNV2EPvbs"
  ) // placeholder for vercel

  const [accounts, setAccounts] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      const accounts = await workspace.program?.account.promoState.all([
        {
          memcmp: {
            offset: 8,
            bytes: merchant.toBase58(),
          },
        },
      ])
      setAccounts(accounts)
      // console.log(accounts)
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
