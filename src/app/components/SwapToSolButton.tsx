"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, VersionedTransaction, Transaction } from "@solana/web3.js";
import { useCallback, useState } from "react";
import { getQuote, getSwapTransaction } from "../utils/jupiterApi";
import { TokenBalance } from "../utils/types";

interface SwapToSolButtonProps {
  token: TokenBalance;
}

const SwapToSolButton: React.FC<SwapToSolButtonProps> = ({ token }) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleSwap = useCallback(async () => {
    if (!publicKey) {
      alert("Connect your wallet first!");
      return;
    }

    setLoading(true);

    const SOL_MINT = "So11111111111111111111111111111111111111112";
    const amountIn = parseFloat(token.amount) * 10 ** 6; // Convert amount to smallest unit
    const slippage = 1; // 1% slippage

    try {
      const quote = await getQuote(token.mint, SOL_MINT, amountIn, slippage);
      console.log("Fetched quote:", quote);

      if (quote && quote.routePlan && quote.routePlan.length > 0) {
        // Fetch swap transaction
        const swapTransactionResponse = await getSwapTransaction(
          quote,
          publicKey.toBase58()
        );
        const { swapTransaction } = swapTransactionResponse;

        // Deserialize the transaction
        const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
        const transaction =
          VersionedTransaction.deserialize(swapTransactionBuf);
        console.log("Deserialized transaction:", transaction);

        let signedTransaction;
        if (signTransaction) {
          // Sign the transaction
          signedTransaction = await signTransaction(transaction);
          console.log("Signed transaction:", signedTransaction);
        } else {
          // Fallback: use sendTransaction to handle signing
          const txid = await sendTransaction(transaction, connection);
          await connection.confirmTransaction(txid, "confirmed");
          alert(`Swapped ${token.amount} of ${token.name} successfully`);
          console.log(`https://solscan.io/tx/${txid}`);
          return;
        }

        // Execute the transaction
        const rawTransaction = signedTransaction.serialize();
        const txid = await connection.sendRawTransaction(rawTransaction, {
          skipPreflight: true,
          maxRetries: 2,
        });
        await connection.confirmTransaction(txid);
        alert(`Swapped ${token.amount} of ${token.name} successfully`);
        console.log(`https://solscan.io/tx/${txid}`);
      } else {
        alert(`No route found for ${token.name}`);
      }
    } catch (error) {
      console.error(`Failed to swap ${token.name}:`, error);
      alert(`Failed to swap ${token.name}`);
    } finally {
      setLoading(false);
    }
  }, [publicKey, token, connection, sendTransaction, signTransaction]);

  return (
    <button onClick={handleSwap} className="btn btn-primary" disabled={loading}>
      {loading ? "Swapping..." : "Swap to SOL"}
    </button>
  );
};

export default SwapToSolButton;
