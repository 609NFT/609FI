"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, ParsedAccountData } from "@solana/web3.js";
import { TokenListProvider, TokenInfo } from "@solana/spl-token-registry";
import CloseAccountButton from "./components/CloseAccountButton";
import Navbar from "./components/Navbar";
import { TokenBalance } from "./utils/types";
import { getQuote } from "./utils/jupiterApi";
import "./styles/styles.css";

export default function Home() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map());
  const [loading, setLoading] = useState(false);
  const [hideWithBalances, setHideWithBalances] = useState(false);

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

    setLoading(true);

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

      // Filter based on checkbox state
      const filteredBalances = balances.filter((token) =>
        hideWithBalances
          ? parseFloat(token.amount) === 0
          : !token.hasJupiterQuote
      );

      setTokenBalances(filteredBalances);
    } catch (error) {
      console.error("Failed to fetch token balances:", error);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, tokenMap, hideWithBalances]);

  useEffect(() => {
    fetchTokenBalances();
  }, [publicKey, fetchTokenBalances]);

  const handleCheckboxChange = () => {
    setHideWithBalances(!hideWithBalances);
  };

  return (
    <div>
      <Navbar />
      <main className="gradient-background">
        <div className="filter-section">
          <label>
            <input
              type="checkbox"
              checked={hideWithBalances}
              onChange={handleCheckboxChange}
            />
            Hide tokens with balances
          </label>
          <button
            onClick={fetchTokenBalances}
            className="btn btn-secondary"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" />
                Refreshing Tokens
              </>
            ) : (
              "Refresh Balances"
            )}
          </button>
        </div>
        <div className="table-container">
          {loading ? (
            <div className="spinner-container">
              <div className="spinner" />
              <p>Refreshing Tokens...</p>
            </div>
          ) : tokenBalances.length > 0 ? (
            <div>
              <h2>Tokens Available to Close or Swap</h2>
              <div className="table-responsive">
                <table className="table-auto">
                  <thead>
                    <tr className="table-header">
                      <th className="px-4 py-2">Token CA</th>
                      <th className="px-4 py-2">Token Amount</th>
                      <th className="px-4 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenBalances.map((token, index) => (
                      <tr key={index} className="table-row">
                        <td className="px-4 py-2">
                          <a
                            target="_blank"
                            href={`https://solscan.io/token/${token.mint}`}
                            rel="noreferrer"
                          >
                            {token.mint}
                          </a>
                        </td>
                        <td className="px-4 py-2">{token.amount}</td>
                        <td className="px-4 py-2">
                          {parseFloat(token.amount) === 0 ? (
                            <CloseAccountButton
                              accountPubkey={new PublicKey(token.pubkey)}
                            />
                          ) : (
                            <div>
                              <div className="btn btn-danger">
                                <a
                                  href={`https://jup.ag/swap/${token.mint}-SOL`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-primary"
                                >
                                  Swap on Jupiter
                                </a>
                              </div>
                              <div className="btn btn-danger">
                                <a
                                  href={`https://raydium.io/swap/?inputMint=${token.mint}&outputMint=sol`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary"
                                >
                                  Swap on Raydium
                                </a>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="no-accounts-message">
              <h2>Wallet has no accounts to close.</h2>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
