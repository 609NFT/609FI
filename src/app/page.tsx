"use client";

import React, { useState, useEffect, useCallback } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, ParsedAccountData } from "@solana/web3.js";
import { TokenListProvider, TokenInfo } from "@solana/spl-token-registry";
import axios from "axios";
import SwapToSolButton from "./components/SwapToSolButton";

type TokenBalance = {
  pubkey: string;
  mint: string;
  amount: string;
  name: string;
  hasJupiterQuote: boolean;
};

export default function Home() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map());

  useEffect(() => {
    const fetchTokenList = async () => {
      const tokens = await new TokenListProvider().resolve();
      const tokenList = tokens.filterByClusterSlug("mainnet-beta").getList();
      const tokenMap = new Map(
        tokenList.map((token) => [token.address, token])
      );
      setTokenMap(tokenMap);
    };

    fetchTokenList();
  }, []);

  const fetchTokenBalances = useCallback(async () => {
    if (!publicKey) return;

    try {
      const accounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        {
          programId: TOKEN_PROGRAM_ID,
        }
      );

      const balances = await Promise.all(
        accounts.value.map(async ({ pubkey, account }) => {
          const parsedAccountData = account.data as ParsedAccountData;
          const parsedInfo = parsedAccountData.parsed?.info;
          const mint = parsedInfo?.mint;
          const amount = parsedInfo?.tokenAmount?.uiAmountString;
          const tokenInfo = mint ? tokenMap.get(mint) : undefined;
          const name = tokenInfo ? tokenInfo.name : "Unregistered Token";

          const SOL_MINT = "So11111111111111111111111111111111111111112";
          const amountIn = parseFloat(amount) * 10 ** 6; // Convert amount to smallest unit

          // Fetch Jupiter quote
          let hasJupiterQuote = false;
          try {
            const routesResponse = await axios.get(
              "https://quote-api.jup.ag/v1/quote",
              {
                params: {
                  inputMint: mint,
                  outputMint: SOL_MINT,
                  amount: amountIn,
                  slippage: 1, // 1% slippage
                },
              }
            );

            const routes = routesResponse.data.data;
            if (routes && routes.length > 0) {
              hasJupiterQuote = true;
            }
          } catch (error) {
            console.error(`Failed to fetch Jupiter quote for ${name}:`, error);
          }

          return {
            pubkey: pubkey.toBase58(),
            mint: mint || "Unknown Mint",
            amount: amount || "0",
            name: name,
            hasJupiterQuote: hasJupiterQuote,
          };
        })
      );

      setTokenBalances(balances);
    } catch (error) {
      console.error("Failed to fetch token balances:", error);
    }
  }, [publicKey, connection, tokenMap]);

  useEffect(() => {
    fetchTokenBalances();
  }, [publicKey, fetchTokenBalances]);

  return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="border hover:border-slate-900 rounded p-4">
        <WalletMultiButton />
        {tokenBalances.length > 0 && (
          <div className="mt-4">
            <h2>Token Balances</h2>
            <table className="table-auto">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mint</th>
                  <th>Amount</th>
                  <th>Jupiter Quote Available</th>
                </tr>
              </thead>
              <tbody>
                {tokenBalances.map((token, index) => (
                  <tr key={index}>
                    <td>{token.name}</td>
                    <td>{token.mint}</td>
                    <td>{token.amount}</td>
                    <td>{token.hasJupiterQuote ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <SwapToSolButton tokenBalances={tokenBalances} />
      </div>
    </main>
  );
}
