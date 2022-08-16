import { FC, useState, useEffect, useCallback } from "react"
import { Transaction, PublicKey } from "@solana/web3.js"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"

import { notify } from "../utils/notifications"

import { createCreateMerchantInstruction } from "../../programs/instructions/createMerchant"
import idl from "../../programs/coupons/token_rewards_coupons.json"

import {
    Metaplex,
    walletAdapterIdentity,
    bundlrStorage,
    MetaplexFile,
    useMetaplexFileFromBrowser,
    findMetadataPda,
} from "@metaplex-foundation/js"

interface Props {
    setMerchant: (string) => void
}

export const CreateMerchant: FC<Props> = ({ setMerchant }) => {
    const wallet = useWallet()
    const { publicKey, sendTransaction } = useWallet()
    const { connection } = useConnection()

    const [imageUrl, setImageUrl] = useState(null)
    const [name, setName] = useState("")

    const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
        "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    )

    // set up metaplex object
    const metaplex = new Metaplex(connection).use(
        bundlrStorage({
            address: "https://devnet.bundlr.network",
            providerUrl: "https://api.devnet.solana.com",
            timeout: 60000,
        })
    )

    if (wallet) {
        metaplex.use(walletAdapterIdentity(wallet))
    }

    // upload image
    const handleImage = async (event) => {
        const file: MetaplexFile = await useMetaplexFileFromBrowser(
            event.target.files[0]
        )

        const imageUrl = await metaplex.storage().upload(file)
        setImageUrl(imageUrl)
    }

    useEffect(() => {
        if (wallet && wallet.connected) {
            async function connectProvider() {
                await wallet.connect()
                const provider = wallet.wallet.adapter
                await provider.connect()
            }
            connectProvider()
        }
    }, [wallet])

    // create new "merchant" account
    const onClick = useCallback(async () => {
        const programId = new PublicKey(idl.metadata.address)
        if (!publicKey) {
            console.log("error", "Wallet not connected!")
            return
        }

        // derive merchant account PDA
        const [merchant, merchantBump] = await PublicKey.findProgramAddress(
            [Buffer.from("MERCHANT"), publicKey.toBuffer()],
            programId
        )

        // build transaction
        const createMerchant = new Transaction().add(
            createCreateMerchantInstruction(
                {
                    merchant: merchant,
                    user: publicKey,
                },
                {
                    name: name.toString(),
                    image: imageUrl.toString(),
                }
            )
        )

        // send transaction
        const transactionSignature = await sendTransaction(
            createMerchant,
            connection
        )

        const url = `https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
        console.log(url)
        setMerchant(merchant)

        notify({
            type: "success",
            message: `Token Created`,
        })
    }, [publicKey, connection, sendTransaction, imageUrl, name])

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                    <div className="mt-1 sm:mt-0 sm:col-span-1">
                        <div className="max-w-lg flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <svg
                                    className="mx-auto h-12 w-12 text-gray-400"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 48 48"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                <div className="flex text-sm text-gray-600">
                                    <label
                                        htmlFor="image-upload"
                                        className="relative cursor-pointer bg-white rounded-md font-medium text-purple-500 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                                    >
                                        {!imageUrl ? (
                                            <div>
                                                <span>Upload Promo Image</span>
                                                <input
                                                    id="image-upload"
                                                    name="image-upload"
                                                    type="file"
                                                    className="sr-only"
                                                    onChange={handleImage}
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <span>Image Uploaded</span>
                                                <img src={imageUrl} />
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="my-6">
                        <input
                            type="text"
                            className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                            placeholder="Merchant Name"
                            onChange={(e) => setName(e.target.value)}
                        />

                        <button
                            className="px-8 m-2 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ..."
                            onClick={onClick}
                        >
                            <span>Create Merchant Account</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
