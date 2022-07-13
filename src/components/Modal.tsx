import { useEffect, useMemo, useRef } from "react";
import styles from "../styles/custom.module.css";

import {
  createQR,
  createQROptions,
  encodeURL,
  TransferRequestURLFields,
  findReference,
  validateTransfer,
  FindReferenceError,
  ValidateTransferError,
  TransactionRequestURLFields,
} from "@solana/pay";

import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import PageHeading from "./PageHeading";
// import BackLink from "./BackLink";
import { FC, useCallback, useState } from "react";

import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import BigNumber from "bignumber.js";

import { usdcAddress } from "../lib/addresses";

import { useRouter } from "next/router";

const MODAL_STYLES = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  backgroundColor: "#FFF",
  padding: "20px",
  zIndex: 1000,
};

const OVERLAY_STYLES = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1000,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
};

// modal to display attributes
export default function Modal({ open, data, onClose, wallet }) {
  if (!open) return null;

  const router = useRouter();

  // Get a connection to Solana devnet
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);
  const connection = new Connection(endpoint);
  const { publicKey } = useWallet();

  //QR code
  const searchParams = new URLSearchParams();
  searchParams.append("wallet", publicKey.toString());

  const reference = useMemo(() => Keypair.generate().publicKey, []);
  searchParams.append("reference", reference.toString());
  searchParams.append("index", data.toString());

  const [size, setSize] = useState(() =>
    typeof window === "undefined"
      ? 400
      : Math.min(window.screen.availWidth - 10, 512)
  );

  useEffect(() => {
    const listener = () =>
      setSize(Math.min(window.screen.availWidth - 10, 512));

    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, []);

  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { location } = window;
    const apiUrl = `${location.protocol}//${
      location.host
    }/api/makeTransactionNft?${searchParams.toString()}`;
    const urlParams: TransactionRequestURLFields = {
      link: new URL(apiUrl), // testing placeholder
      label: "Test",
      message: "Test Message",
    };
    const solanaUrl = encodeURL(urlParams);
    const qr = createQR(solanaUrl, size, "white");

    qrRef.current.innerHTML = "";
    qr.append(qrRef.current);
  });

  // Check every 0.5s if the transaction is completed
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Check if there is any transaction for the reference
        const signatureInfo = await findReference(connection, reference, {
          finality: "confirmed",
        });
        // // Validate that the transaction has the expected recipient, amount and SPL token
        // await validateTransfer(
        //   connection,
        //   signatureInfo.signature,
        //   {
        //     recipient: new PublicKey(wallet),
        //     amount: new BigNumber(0),
        //     splToken: usdcAddress,
        //     reference,
        //   },
        //   { commitment: "confirmed" }
        // );
        router.push("/confirmedNft");
        // console.log("confirmed");
      } catch (e) {
        if (e instanceof FindReferenceError) {
          // No transaction found yet, ignore this error
          return;
        }
        if (e instanceof ValidateTransferError) {
          // Transaction is invalid
          console.error("Transaction is invalid", e);
          return;
        }
        console.error("Unknown error", e);
      }
    }, 500);
    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <div style={OVERLAY_STYLES} />
      <div style={MODAL_STYLES}>
        <div ref={qrRef} />
        <div className="px-8 m-2 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ...">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
