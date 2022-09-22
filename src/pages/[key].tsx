import { useRouter, withRouter } from "next/router"
import { useEffect, useState, useMemo } from "react"
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
import idl from "../contexts/Workspace/token_rewards.json"
import { IDL, TokenRewards } from "../contexts/Workspace/token_rewards_coupons"
import MockWallet from "../contexts/Workspace/MockWallet"
import {
  Program,
  AnchorProvider,
  Idl,
  setProvider,
} from "@project-serum/anchor"
import QrScanner from "components/QrScanner"

import {
  Metaplex,
  walletAdapterIdentity,
  bundlrStorage,
  MetaplexFile,
  useMetaplexFileFromBrowser,
  findMetadataPda,
} from "@metaplex-foundation/js"

export default function Promo() {
  const [balance, setBalance] = useState(0)
  const [MintBalance, setMintBalance] = useState(0)
  const [nftData, setNftData] = useState(0)
  const [txSig, setTxSig] = useState("")
  const [keypair, setKeypair] = useState<Keypair>(new Keypair())
  const [confirm, setConfirm] = useState(null)
  const { publicKey, sendTransaction } = useWallet()
  const walletAdapter = useWallet()
  const { connection } = useConnection()
  const programId = new PublicKey(idl.metadata.address)
  const provider = new AnchorProvider(connection, MockWallet, {})
  setProvider(provider)

  const metaplex = useMemo(() => {
    return Metaplex.make(connection).use(walletAdapterIdentity(walletAdapter))
  }, [connection, walletAdapter])

  const program = new Program(
    IDL as Idl,
    programId
  ) as unknown as Program<TokenRewards>

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
        (await connection.getBalance(keypair.publicKey)) / LAMPORTS_PER_SOL
      setBalance(balance)

      try {
        const promo = new PublicKey(data)
        const [mint] = await PublicKey.findProgramAddress(
          [Buffer.from("MINT"), promo.toBuffer()],
          programId
        )

        const tokenAddress = await getAssociatedTokenAddress(
          mint,
          keypair.publicKey
        )

        const account = await getAccount(connection, tokenAddress)
        setMintBalance(Number(account.amount))

        const nft = await metaplex.nfts().findByMint(mint)
        let fetchResult = await fetch(nft.uri)
        let json = await fetchResult.json()
        setNftData(json)
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
    const transactionSignature = await sendTransaction(transaction, connection)

    setTxSig(transactionSignature)
    const confirm = await connection.confirmTransaction(transactionSignature)
    setConfirm(confirm)
  }

  const sendMint = async () => {
    const promo = new PublicKey(data)
    const [mint] = await PublicKey.findProgramAddress(
      [Buffer.from("MINT"), promo.toBuffer()],
      programId
    )

    const tokenAddress = await getAssociatedTokenAddress(
      mint,
      keypair.publicKey
    )

    const createAccountInstruction = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      tokenAddress,
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
        connection,
        tokenAddress,
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

    const instruction = await program.methods
      .mintPromo()
      .accounts({
        promo: promo,
        promoMint: mint,
        // tokenProgram: TOKEN_PROGRAM_ID,
        tokenAccount: tokenAddress,
        user: keypair.publicKey,
      })
      .instruction()

    // add a bit extra
    // const sendSolInstruction = SystemProgram.transfer({
    //   fromPubkey: payer.publicKey,
    //   toPubkey: keypair.publicKey,
    //   lamports: LAMPORTS_PER_SOL * 0.000204,
    // })

    transaction.add(instruction)
    const transactionSignature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, keypair]
    )

    setTxSig(transactionSignature)
    const confirm = await connection.confirmTransaction(transactionSignature)
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

    const tokenAddress = await getAssociatedTokenAddress(mint, publicKey)

    const senderMintAddress = await getAssociatedTokenAddress(
      mint,
      keypair.publicKey
    )

    const createAccountInstruction = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      tokenAddress,
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
        connection,
        tokenAddress,
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
      tokenAddress, // dest
      keypair.publicKey,
      1,
      [],
      TOKEN_PROGRAM_ID
    )

    transaction.add(sendMintInstruction)
    const transactionSignature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [keypair, payer]
    )

    setTxSig(transactionSignature)
    const confirm = await connection.confirmTransaction(transactionSignature)
    setConfirm(confirm)
  }

  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div>PublicKey: {keypair.publicKey.toString()}</div>
        {/* <div>Sol Balance : {balance}</div> */}
        <div>Coupon Balance : {MintBalance}</div>
        <ul>{nftData.name}</ul>
        <img className="w-48" src={nftData.image} />

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
