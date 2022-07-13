import { FC, useEffect, useState } from "react";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

import { DisplayPromo } from "components/DisplayPromo";
import idl from "../../../programs/coupons/token_rewards_coupons.json";

export const DisplayView: FC = ({}) => {
  const [merchant, setMerchant] = useState(null);

  const wallet = useWallet();
  const { connection } = useConnection();

  const programId = new PublicKey(idl.metadata.address);

  useEffect(() => {
    if (wallet.publicKey) {
      console.log(wallet.publicKey.toBase58());
      console.log(merchant);

      async function merchantInfo() {
        const [merchant, merchantBump] = await PublicKey.findProgramAddress(
          [Buffer.from("MERCHANT"), wallet.publicKey.toBuffer()],
          programId
        );
        try {
          const merchantInfo = await connection.getAccountInfo(merchant);
          setMerchant(merchantInfo);
          console.log("merchantinfo", merchantInfo);
          console.log(merchant);
        } catch (error: unknown) {}
      }

      merchantInfo();
    }
  }, [wallet.publicKey, connection]);

  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-[#9945FF] to-[#14F195]">
          Promos
        </h1>
        <div className="text-center">
          {merchant ? (
            <div>
              <DisplayPromo />
            </div>
          ) : (
            <>No Promotions to Display</>
          )}
        </div>
      </div>
    </div>
  );
};
