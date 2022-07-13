import { FC, useState, useEffect, useCallback, useRef } from "react";
import { Transaction, PublicKey } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

import { Metaplex } from "@metaplex-foundation/js";

import { Merchant } from "../../programs/coupons/accounts/Merchant";
import { Promo } from "../../programs/coupons/accounts/Promo";
import idl from "../../programs/coupons/token_rewards_coupons.json";

import Modal from "./Modal";

import styles from "../styles/custom.module.css";
import BN from "bn.js";

export const DisplayPromo: FC = () => {
  const wallet = useWallet();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [nfts, setNfts] = useState(null);
  const [promos, setPromos] = useState(null);
  const [info, setInfo] = useState(null);

  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  const metaplex = new Metaplex(connection);

  const programId = new PublicKey(idl.metadata.address);

  const fetchPromo = async () => {
    let mints = [];
    let info = [];

    const [merchant, merchantBump] = await PublicKey.findProgramAddress(
      [Buffer.from("MERCHANT"), publicKey.toBuffer()],
      programId
    );

    const merchantInfo = await Merchant.fromAccountAddress(
      connection,
      merchant
    );

    const count = merchantInfo.promoCount.toNumber();

    for (let i = count - 1; i >= 0; i--) {
      const [promo, promoBump] = await PublicKey.findProgramAddress(
        [merchant.toBuffer(), new BN(i).toArrayLike(Buffer, "be", 8)],
        programId
      );

      const promoInfo = await Promo.fromAccountAddress(connection, promo);
      mints.push(promoInfo.mint);
      info.push([i, promo, promoInfo.mint]);
      // console.log(info);
    }

    const nfts = await metaplex.nfts().findAllByMintList(mints);
    // console.log(nfts);
    setNfts(nfts);
    // console.log("nfts", nfts);
  };

  let jsonData = [];

  // fetch nft data in loop
  const forLoop = async () => {
    if (nfts !== null) {
      // console.log("data", data);
      var index = nfts.length - 1;
      for (let i = 0; i < nfts.length; i++) {
        // console.log(data[i].uri);
        let fetchResult = await fetch(nfts[i].uri);
        let json = await fetchResult.json();
        console.log(json);
        console.log(index);
        jsonData.push([index, json]);
        index -= 1;
      }
      setPromos(jsonData);
      console.log(jsonData);
    }

    run.current = true;
  };

  useEffect(() => {
    if (wallet && wallet.connected) {
      async function connectProvider() {
        // console.log(wallet);
        await wallet.connect();
        const provider = wallet.wallet.adapter;
        await provider.connect();
      }
      connectProvider();
    }
    fetchPromo();
  }, [wallet]);

  const run = useRef(true);
  useEffect(() => {
    if (run.current) {
      run.current = false;
      forLoop();
    }
  }, [nfts]);

  return (
    <div>
      {promos && (
        <div className={styles.gridNFT}>
          {promos.map(([index, promo]) => (
            <div>
              <ul>{promo.name}</ul>
              <img src={promo.image} />
              <button
                className="px-2 m-1 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-200 hover:to-yellow-500 ..."
                onClick={() => {
                  setModalData(index);
                  setIsOpen(true);
                }}
              >
                Mint Promo
              </button>
            </div>
          ))}
          <Modal
            data={modalData}
            open={isOpen}
            onClose={() => setIsOpen(false)}
            wallet={wallet}
          />
        </div>
      )}
    </div>
  );
};
