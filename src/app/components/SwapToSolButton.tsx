"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useCallback } from "react";
import axios from "axios";

type TokenBalance = {
  pubkey: string;
  mint: string;
  amount: string;
  name: string;
  hasJupiterQuote: boolean;
};

interface SwapToSolButtonProps {
  tokenBalances: TokenBalance[];
}

const SwapToSolButton: React.FC<SwapToSolButtonProps> = ({ tokenBalances }) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const handleSwap = useCallback(async () => {
    if (!publicKey) {
      alert("Connect your wallet first!");
      return;
    }

    const SOL_MINT = new PublicKey(
      "So11111111111111111111111111111111111111112"
    );

    for (const token of tokenBalances) {
      if (token.mint === SOL_MINT.toBase58()) continue; // Skip if the token is already SOL

      const amountIn = parseFloat(token.amount) * 10 ** 6; // Convert amount to smallest unit

      try {
        // Fetch swap routes from Jupiter API
        alert(`Fetching routes for ${token.name}...`);
        const routesResponse = await axios.get(
          "https://quote-api.jup.ag/v1/quote",
          {
            params: {
              inputMint: token.mint,
              outputMint: SOL_MINT.toBase58(),
              amount: amountIn,
              slippage: 15, // 15% slippage
            },
          }
        );

        const routes = routesResponse.data.data;
        if (!routes || routes.length === 0) {
          alert(`No route found for ${token.name}`);
          continue;
        }

        alert(`Routes for ${token.name}: ${JSON.stringify(routes, null, 2)}`);

        const bestRoute = routes[0];

        // Fetch swap transaction from Jupiter API
        const swapTransactionResponse = await axios.post(
          "https://quote-api.jup.ag/v6/swap",
          {
            route: bestRoute,
            userPublicKey: publicKey.toBase58(),
            wrapAndUnwrapSol: true,
          }
        );

        const { swapTransaction } = swapTransactionResponse.data;
        alert(`Swap Transaction for ${token.name}: ${swapTransaction}`);

        // Convert the serialized transaction to Transaction object
        const transaction = Transaction.from(
          Buffer.from(swapTransaction, "base64")
        );

        const signedTransaction = await sendTransaction(
          transaction,
          connection
        );
        await connection.confirmTransaction(signedTransaction, "confirmed");

        alert(`Swapped ${token.amount} of ${token.name} successfully`);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          alert(`Failed to swap ${token.name}: ${error.message}`);
          console.error("Axios error response:", error.response);
        } else if (error instanceof Error) {
          alert(`Failed to swap ${token.name}: ${error.message}`);
        } else {
          alert(`Failed to swap ${token.name}: An unknown error occurred`);
        }
      }
    }
  }, [publicKey, tokenBalances, connection, sendTransaction]);

  return (
    <button onClick={handleSwap} className="btn btn-primary">
      Swap All Tokens to SOL
    </button>
  );
};

export default SwapToSolButton;
