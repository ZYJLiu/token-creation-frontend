import { useState } from "react";
import dynamic from "next/dynamic";
import { Keypair, Transaction } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
const QrReader = dynamic(() => import("react-qr-reader"), { ssr: false });

interface props {
  keypair: Keypair;
}

const QrScanner = ({ keypair }: props) => {
  const [data, setData] = useState("No result");
  const [isScanning, setIsScanning] = useState(false);
  const { connection } = useConnection();

  const handleScan = async (scanData: string) => {
    if (!scanData) return;
    setIsScanning(false);

    if (!scanData.startsWith("solana:")) {
      alert("Only valid with Solana Pay QR codes");
      setData("No result");
      return;
    }

    scanData = scanData.substring(7);
    scanData = decodeURIComponent(scanData);

    for (let i = scanData.length - 1; i >= 0; i--) {
      if (scanData.charAt(i) == "?") {
        scanData = scanData.substring(0, i) + "&" + scanData.substring(i + 1);
        break;
      }
    }
    const data = {
      account: keypair.publicKey.toString(),
    };

    const res = await fetch(scanData, {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const { transaction, message } = await res.json();
    const decodedTx = Buffer.from(transaction, "base64");
    const tx = Transaction.from(decodedTx);
    await connection.sendTransaction(tx, [keypair]);
    setData("Scanned");
  };

  return (
    <div className="flex flex-col items-center">
      {isScanning ? (
        <div className="mb-32 flex flex-col">
          <QrReader
            facingMode="environment"
            delay={500}
            onError={(err) => console.log(err)}
            onScan={(scanData) => handleScan(scanData)}
            style={{ width: "200px", height: "100px" }}
          />
          <button className="mt-32" onClick={() => setIsScanning(false)}>
            Close Scanner
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap flex-col">
          <p>Not scanning</p>
          <button onClick={() => setIsScanning(true)}>Scan</button>
          <p className="break-all">Data: {data}</p>
        </div>
      )}
    </div>
  );
};

export default QrScanner;
