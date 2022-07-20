//ngrok http 3000

import {
    getAssociatedTokenAddress,
    getMint,
    TokenAccountNotFoundError,
    TokenInvalidAccountOwnerError,
    getAccount,
    Account,
    createAssociatedTokenAccountInstruction,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createBurnInstruction,
    burn,
} from "@solana/spl-token"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import {
    clusterApiUrl,
    Connection,
    Keypair,
    PublicKey,
    Transaction,
} from "@solana/web3.js"
import { NextApiRequest, NextApiResponse } from "next"
import { usdcAddress } from "../../lib/addresses"

import { createMintNftInstruction } from "../../../programs/instructions/mintNft"
import idl from "../../../programs/coupons/token_rewards_coupons.json"

import BN from "bn.js"

export type MakeTransactionInputData = {
    account: string
}

type MakeTransactionGetResponse = {
    label: string
    icon: string
}

export type MakeTransactionOutputData = {
    transaction: string
    message: string
}

type ErrorOutput = {
    error: string
}

function get(res: NextApiResponse<MakeTransactionGetResponse>) {
    res.status(200).json({
        label: "Promo",
        icon: "https://seeklogo.com/images/S/solana-sol-logo-12828AD23D-seeklogo.com.png",
    })
}

async function post(
    req: NextApiRequest,
    res: NextApiResponse<MakeTransactionOutputData | ErrorOutput>
) {
    try {
        // We pass the reference to use in the query
        const { reference } = req.query
        if (!reference) {
            console.log("Returning 400: no reference")
            res.status(400).json({ error: "No reference provided" })
            return
        }
        console.log(reference)

        // We pass the buyer's public key in JSON body
        const { account } = req.body as MakeTransactionInputData
        if (!account) {
            console.log("Returning 400: no account")
            res.status(400).json({ error: "No account provided" })
            return
        }

        const { wallet } = req.query
        if (!wallet) {
            console.log("Returning 400: no wallet")
            res.status(400).json({ error: "No walet provided" })
            return
        }

        const { index } = req.query
        if (!index) {
            console.log("Returning 400: no index")
            res.status(400).json({ error: "No index provided" })
            return
        }

        const count = index as string
        const publicKey = new PublicKey(wallet)

        const buyerPublicKey = new PublicKey(account)

        const network = WalletAdapterNetwork.Devnet
        const endpoint = clusterApiUrl(network)
        const connection = new Connection(endpoint)

        const programId = new PublicKey(idl.metadata.address)

        // merchant account PDA
        const [merchant, merchantBump] = await PublicKey.findProgramAddress(
            [Buffer.from("MERCHANT"), publicKey.toBuffer()],
            programId
        )

        // promo account PDA
        const [promo, promoBump] = await PublicKey.findProgramAddress(
            [merchant.toBuffer(), new BN(count).toArrayLike(Buffer, "be", 8)],
            programId
        )

        // promo mint PDA
        const [promoMint, promoMintBump] = await PublicKey.findProgramAddress(
            [Buffer.from("MINT"), promo.toBuffer()],
            programId
        )

        // Get a recent blockhash to include in the transaction
        const { blockhash } = await connection.getLatestBlockhash("finalized")

        const transaction = new Transaction({
            recentBlockhash: blockhash,
            feePayer: buyerPublicKey,
        })

        // get ATA address for user scanning QR code
        const customerNft = await getAssociatedTokenAddress(
            promoMint,
            buyerPublicKey
        )

        // instruction to fetch ATA
        const createAccountInstruction =
            createAssociatedTokenAccountInstruction(
                buyerPublicKey,
                customerNft,
                buyerPublicKey,
                promoMint,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            )

        // check if ATA exists, if not add instruction to create one
        let buyer: Account
        try {
            buyer = await getAccount(
                connection,
                customerNft,
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

        // instruction to mint promo token
        const transferInstruction = createMintNftInstruction({
            promo: promo,
            promoMint: promoMint,
            customerNft: customerNft,
            user: buyerPublicKey,
        })

        // Add the reference to the instruction as a key
        // This will mean this transaction is returned when we query for the reference
        transferInstruction.keys.push({
            pubkey: new PublicKey(reference),
            isSigner: false,
            isWritable: false,
        })

        // Add both instructions to the transaction
        transaction.add(transferInstruction)
        // transaction.add(burnInstruction);

        // Serialize the transaction and convert to base64 to return it
        const serializedTransaction = transaction.serialize({
            // We will need the buyer to sign this transaction after it's returned to them
            requireAllSignatures: false,
        })

        const base64 = serializedTransaction.toString("base64")

        // Insert into database: reference, amount

        const message = "Test Message"

        // Return the serialized transaction
        const responseBody = {
            transaction: base64,
            message,
        }

        console.log("returning 200", responseBody)
        res.status(200).json(responseBody)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "error creating transaction" })
        return
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<
        MakeTransactionGetResponse | MakeTransactionOutputData | ErrorOutput
    >
) {
    if (req.method === "GET") {
        return get(res)
    } else if (req.method === "POST") {
        return await post(req, res)
    } else {
        return res.status(405).json({ error: "Method not allowed" })
    }
}
