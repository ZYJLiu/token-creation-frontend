import { FC, useEffect, useState } from "react"
import Link from "next/link"

import { useWallet, useConnection } from "@solana/wallet-adapter-react"

import { useWorkspace } from "contexts/Workspace"
import styles from "../../styles/custom.module.css"

export const MerchantsView: FC = ({}) => {
  const [merchant, setMerchant] = useState(null)

  const { connection } = useConnection()

  const workspace = useWorkspace()

  useEffect(() => {
    if (connection) {
      async function merchantInfo() {
        try {
          const merchants = await workspace.program.account.merchantState.all()
          setMerchant(merchants)
        } catch (error: unknown) {}
      }
      merchantInfo()
    }
  }, [connection])

  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-[#9945FF] to-[#14F195]">
          Merchants
        </h1>
        <div className="text-center">
          {merchant ? (
            <div className={styles.gridNFT}>
              {Object.keys(merchant).map((key, index) => {
                const data = merchant[key]
                return (
                  <div>
                    <div>
                      <img src={data.account.image} />
                      <ul>Name: {data.account.name}</ul>
                      <ul>Count: {data.account.promoCount.toNumber()}</ul>
                      <button className="px-2 m-1 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-200 hover:to-yellow-500 ...">
                        <Link
                          href={`merchants/` + data.account.user.toString()}
                        >
                          See Promos
                        </Link>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <>No Promotions to Display</>
          )}
        </div>
      </div>
    </div>
  )
}
