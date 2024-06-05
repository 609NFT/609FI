"use client";

import { TokenBalance } from "./utils/types";
import SwapToSolButton from "./components/SwapToSolButton";
import CloseAccountButton from "./components/CloseAccountButton";
import Navbar from "./components/Navbar"; // Import the Navbar component

import React, { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, ParsedAccountData } from "@solana/web3.js";
import { TokenListProvider, TokenInfo } from "@solana/spl-token-registry";
import { getQuote } from "./utils/jupiterApi";
import "./styles/styles.css"; // Import the CSS file

export default function Home() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [filteredBalances, setFilteredBalances] = useState<TokenBalance[]>([]);
  const [hideZeroBalance, setHideZeroBalance] = useState(false);
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
          const slippage = 1; // 1% slippage

          const quote = await getQuote(mint, SOL_MINT, amountIn, slippage);
          const hasJupiterQuote = !!(
            quote &&
            quote.routePlan &&
            quote.routePlan.length > 0
          );

          return {
            pubkey: pubkey.toBase58(),
            mint: mint || "Unknown Mint",
            amount: amount || "0",
            name: name,
            hasJupiterQuote: hasJupiterQuote,
            quote: quote,
          };
        })
      );

      setTokenBalances(balances);
      setFilteredBalances(balances);
    } catch (error) {
      console.error("Failed to fetch token balances:", error);
    }
  }, [publicKey, connection, tokenMap]);

  useEffect(() => {
    fetchTokenBalances();
  }, [publicKey, fetchTokenBalances]);

  useEffect(() => {
    if (hideZeroBalance) {
      setFilteredBalances(
        tokenBalances.filter((token) => parseFloat(token.amount) > 0)
      );
    } else {
      setFilteredBalances(tokenBalances);
    }
  }, [hideZeroBalance, tokenBalances]);

  const handleFilterChange = () => {
    setHideZeroBalance(!hideZeroBalance);
  };

  return (
    <div>
      <Navbar />
      <main className="gradient-background">
        <div className="border hover:border-slate-900 rounded p-4 mt-16">
          <button
            onClick={fetchTokenBalances}
            className="btn btn-secondary mt-4"
          >
            Refresh Balances
          </button>
          <div className="mt-4">
            <label>
              <input
                type="checkbox"
                checked={hideZeroBalance}
                onChange={handleFilterChange}
              />
              Hide tokens with 0 balance
            </label>
          </div>
          {filteredBalances.length > 0 && (
            <div className="mt-4">
              <h2>Token Balances</h2>
              <table className="table-auto">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Mint</th>
                    <th>Amount</th>
                    <th>Has Jupiter Quote</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBalances.map((token, index) => (
                    <tr key={index}>
                      <td>{token.name}</td>
                      <td>{token.mint}</td>
                      <td>{token.amount}</td>
                      <td>{token.hasJupiterQuote ? "Yes" : "No"}</td>
                      <td>
                        <SwapToSolButton token={token} />
                        {parseFloat(token.amount) === 0 && (
                          <CloseAccountButton
                            accountPubkey={new PublicKey(token.pubkey)}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
