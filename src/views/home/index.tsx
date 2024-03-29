// Next, React
import { FC, useEffect, useState } from "react"

// Wallet
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"

import { CreatePromo } from "components/CreatePromoForm"
import { CreateMerchant } from "components/CreateMerchantForm"
import { useWorkspace } from "contexts/Workspace"

import useUserSOLBalanceStore from "../../stores/useUserSOLBalanceStore"

export const HomeView: FC = ({}) => {
  const [merchant, setMerchant] = useState(null)

  const { connection } = useConnection()
  const wallet = useWallet()
  const workspace = useWorkspace()
  const program = workspace.program

  const balance = useUserSOLBalanceStore((s) => s.balance)
  const { getUserSOLBalance } = useUserSOLBalanceStore()

  useEffect(() => {
    if (wallet.publicKey) {
      console.log(wallet.publicKey.toBase58())
      getUserSOLBalance(wallet.publicKey, connection)

      async function merchantInfo() {
        const [merchant, merchantBump] = await PublicKey.findProgramAddress(
          [Buffer.from("MERCHANT"), wallet.publicKey.toBuffer()],
          program.programId
        )
        try {
          //   const merchantInfo = await connection.getAccountInfo(merchant)
          const merchantInfo = await connection.getAccountInfo(merchant)
          setMerchant(merchantInfo)
          console.log(merchantInfo)
        } catch (error: unknown) {}
      }

      merchantInfo()
    }
  }, [wallet.publicKey, connection, getUserSOLBalance])

  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-[#9945FF] to-[#14F195]">
          Create Promo
        </h1>
        <div className="text-center">
          {merchant ? (
            <div>
              SOL Balance: {(balance || 0).toLocaleString()}
              <CreatePromo />
            </div>
          ) : (
            <div>
              <CreateMerchant setMerchant={setMerchant} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
