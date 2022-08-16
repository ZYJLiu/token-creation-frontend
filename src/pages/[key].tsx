import { useRouter, withRouter } from "next/router"
import { useEffect, useState } from "react"
import {
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  Transaction,
  PublicKey,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js"
import {
  getAssociatedTokenAddress,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
  getAccount,
  Account,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createTransferInstruction,
} from "@solana/spl-token"
import { useWorkspace } from "contexts/Workspace"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import styles from "../styles/Home.module.css"
import { mapping } from "../lib/mapping"
import base58 from "bs58"
import {
  IDL,
  TokenRewardsCoupons,
} from "../contexts/Workspace/token_rewards_coupons"
import MockWallet from "../contexts/Workspace/MockWallet"
import {
  Program,
  AnchorProvider,
  Idl,
  setProvider,
} from "@project-serum/anchor"
import QrScanner from "components/QrScanner"

export default function Promo() {
  const [balance, setBalance] = useState(0)
  const [MintBalance, setMintBalance] = useState(0)
  const [txSig, setTxSig] = useState("")
  const [keypair, setKeypair] = useState<Keypair>(new Keypair())
  const [confirm, setConfirm] = useState(null)
  const { publicKey, sendTransaction } = useWallet()
  const connection = useConnection()
  const programId = new PublicKey(
    "2voaAEWrDYbrP5wPgm3K3QdPGzvstAC1b8QuGaPRSg3U"
  )
  const provider = new AnchorProvider(connection.connection, MockWallet, {})
  setProvider(provider)
  const program = new Program(
    IDL as Idl,
    programId
  ) as unknown as Program<TokenRewardsCoupons>

  const payerPrivateKey = process.env.NEXT_PUBLIC_PAYER as string
  const payer = Keypair.fromSecretKey(base58.decode(payerPrivateKey))

  const link = () => {
    return txSig ? `https://explorer.solana.com/tx/${txSig}?cluster=devnet` : ""
  }

  const router = useRouter()
  const { key, data } = router.query

  function generateKeypair() {
    let seed = []

    for (let i = 0; i < key.length; i++) {
      const u8s = mapping[key[i]]
      seed = seed.concat(u8s)
    }
    const keypair = Keypair.fromSeed(new Uint8Array(seed))
    setKeypair(keypair)
  }

  useEffect(() => {
    if (!router.isReady) return

    generateKeypair()
  }, [router.isReady])

  useEffect(() => {
    const getBalance = async () => {
      const balance =
        (await connection.connection.getBalance(keypair.publicKey)) /
        LAMPORTS_PER_SOL
      setBalance(balance)

      try {
        const promo = new PublicKey(data)
        const [mint] = await PublicKey.findProgramAddress(
          [Buffer.from("MINT"), promo.toBuffer()],
          programId
        )

        const receiverMintAddress = await getAssociatedTokenAddress(
          mint,
          keypair.publicKey
        )

        const account = await getAccount(
          connection.connection,
          receiverMintAddress
        )
        setMintBalance(Number(account.amount))
      } catch {}
    }
    getBalance()
  }, [keypair, confirm])

  useEffect(() => {
    if (!router.isReady) return
    sendMint()
  }, [keypair])

  const sendSol = async (event) => {
    event.preventDefault()
    if (!connection || !publicKey) {
      return
    }
    const transaction = new Transaction()

    const sendSolInstruction = SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: keypair.publicKey,
      lamports: LAMPORTS_PER_SOL * event.target.amount.value,
    })

    transaction.add(sendSolInstruction)
    const transactionSignature = await sendTransaction(
      transaction,
      connection.connection
    )

    setTxSig(transactionSignature)
    const confirm = await connection.connection.confirmTransaction(
      transactionSignature
    )
    setConfirm(confirm)
  }

  const sendMint = async () => {
    const promo = new PublicKey(data)
    const [mint] = await PublicKey.findProgramAddress(
      [Buffer.from("MINT"), promo.toBuffer()],
      programId
    )

    const receiverMintAddress = await getAssociatedTokenAddress(
      mint,
      keypair.publicKey
    )

    const createAccountInstruction = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      receiverMintAddress,
      keypair.publicKey,
      mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )

    const transaction = new Transaction()
    transaction.feePayer = payer.publicKey

    let buyer: Account
    try {
      buyer = await getAccount(
        connection.connection,
        receiverMintAddress,
        "confirmed",
        TOKEN_PROGRAM_ID
      )
      if (buyer.amount > 0) return
    } catch (error: unknown) {
      if (
        error instanceof TokenAccountNotFoundError ||
        error instanceof TokenInvalidAccountOwnerError
      ) {
        try {
          transaction.add(createAccountInstruction)
        } catch (error: unknown) {}
      } else {
        throw error
      }
    }

    const mintInstruction = await program.methods
      .mintNft()
      .accounts({
        promo: promo,
        promoMint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        customerNft: receiverMintAddress,
        user: keypair.publicKey,
      })
      .signers([keypair, payer])
      .instruction()

    // add a bit extra
    // const sendSolInstruction = SystemProgram.transfer({
    //   fromPubkey: payer.publicKey,
    //   toPubkey: keypair.publicKey,
    //   lamports: LAMPORTS_PER_SOL * 0.000204,
    // })

    transaction.add(mintInstruction)
    const transactionSignature = await sendAndConfirmTransaction(
      connection.connection,
      transaction,
      [payer, keypair]
    )

    setTxSig(transactionSignature)
    const confirm = await connection.connection.confirmTransaction(
      transactionSignature
    )
    setConfirm(confirm)
  }

  const withdrawMint = async (event) => {
    event.preventDefault()
    if (!connection || !publicKey) {
      return
    }

    const promo = new PublicKey(data)
    const [mint] = await PublicKey.findProgramAddress(
      [Buffer.from("MINT"), promo.toBuffer()],
      programId
    )

    const receiverMintAddress = await getAssociatedTokenAddress(mint, publicKey)

    const senderMintAddress = await getAssociatedTokenAddress(
      mint,
      keypair.publicKey
    )

    const createAccountInstruction = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      receiverMintAddress,
      publicKey,
      mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )

    const transaction = new Transaction()
    transaction.feePayer = payer.publicKey

    let buyer: Account
    try {
      buyer = await getAccount(
        connection.connection,
        receiverMintAddress,
        "confirmed",
        TOKEN_PROGRAM_ID
      )
    } catch (error: unknown) {
      if (
        error instanceof TokenAccountNotFoundError ||
        error instanceof TokenInvalidAccountOwnerError
      ) {
        try {
          transaction.add(createAccountInstruction)
        } catch (error: unknown) {}
      } else {
        throw error
      }
    }

    const sendMintInstruction = createTransferInstruction(
      senderMintAddress, // source
      receiverMintAddress, // dest
      keypair.publicKey,
      1,
      [],
      TOKEN_PROGRAM_ID
    )

    transaction.add(sendMintInstruction)
    const transactionSignature = await sendAndConfirmTransaction(
      connection.connection,
      transaction,
      [keypair, payer]
    )

    setTxSig(transactionSignature)
    const confirm = await connection.connection.confirmTransaction(
      transactionSignature
    )
    setConfirm(confirm)
  }

  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div>PublicKey: {keypair.publicKey.toString()}</div>
        {/* <div>Sol Balance : {balance}</div> */}
        <div>Coupon Balance : {MintBalance}</div>

        <QrScanner keypair={keypair} />
        <div>
          {publicKey ? (
            <div>
              <br />
              <form onSubmit={withdrawMint} className={styles.form}>
                <label htmlFor="amount">Withdraw Coupon:</label>
                <button
                  type="submit"
                  className="px-2 m-1 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-200 hover:to-yellow-500 ..."
                >
                  Withdraw
                </button>
              </form>
            </div>
          ) : (
            <span>Connect Your Wallet</span>
          )}
          {txSig ? (
            <div>
              <p>View your transaction on </p>
              <a href={link()}>Solana Explorer</a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
