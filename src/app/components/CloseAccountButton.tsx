import React, { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { createCloseAccountInstruction } from "@solana/spl-token";

interface CloseAccountButtonProps {
  accountPubkey: PublicKey;
}

const CloseAccountButton: React.FC<CloseAccountButtonProps> = ({
  accountPubkey,
}) => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleCloseAccount = async () => {
    if (!publicKey) {
      alert("Connect your wallet first!");
      return;
    }

    setLoading(true);

    try {
      const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const txn = new Transaction().add(
        createCloseAccountInstruction(accountPubkey, publicKey, publicKey)
      );
      txn.feePayer = publicKey;
      txn.recentBlockhash = recentBlockhash;

      if (signTransaction) {
        const signedTransaction = await signTransaction(txn);
        const serializedTransaction = signedTransaction.serialize();
        const txid = await connection.sendRawTransaction(serializedTransaction);
        await connection.confirmTransaction(txid, "confirmed");

        alert(
          "Account closed successfully! Enjoy your SOL. Please refresh tokens to see updated list."
        );
        console.log(`Account closed successfully. Transaction ID: ${txid}`);
      } else {
        alert("Wallet does not support transaction signing");
      }
    } catch (error) {
      console.error("Failed to close account:", error);
      alert("Failed to close account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCloseAccount}
      className="btn btn-danger"
      disabled={loading}
    >
      {loading ? (
        <>
          <div className="spinner" />
          Closing...
        </>
      ) : (
        "Close Account"
      )}
    </button>
  );
};

export default CloseAccountButton;
