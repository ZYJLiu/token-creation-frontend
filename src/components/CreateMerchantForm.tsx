import { FC, useState, useEffect, useCallback } from "react";
import { Transaction, PublicKey } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

import { notify } from "../utils/notifications";

import { createCreateMerchantInstruction } from "../../programs/coupons/instructions/createMerchant";
import idl from "../../programs/coupons/token_rewards_coupons.json";

interface Props {
  setMerchant: (string) => void;
}

export const CreateMerchant: FC<Props> = ({ setMerchant }) => {
  const wallet = useWallet();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [name, setName] = useState("");

  useEffect(() => {
    if (wallet && wallet.connected) {
      async function connectProvider() {
        console.log(wallet);
        await wallet.connect();
        const provider = wallet.wallet.adapter;
        await provider.connect();
      }
      connectProvider();
    }
  }, [wallet]);

  const onClick = useCallback(async () => {
    const programId = new PublicKey(idl.metadata.address);
    if (!publicKey) {
      console.log("error", "Wallet not connected!");
      return;
    }

    const [merchant, merchantBump] = await PublicKey.findProgramAddress(
      [Buffer.from("MERCHANT"), publicKey.toBuffer()],
      programId
    );

    const createMerchant = new Transaction().add(
      createCreateMerchantInstruction(
        {
          merchant: merchant,
          user: publicKey,
        },
        {
          name: name.toString(),
        }
      )
    );

    const transactionSignature = await sendTransaction(
      createMerchant,
      connection
    );

    const url = `https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`;
    console.log(url);
    setMerchant(merchant);

    notify({
      type: "success",
      message: `Token Created`,
    });
  }, [publicKey, connection, sendTransaction]);

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
        <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
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
  );
};
