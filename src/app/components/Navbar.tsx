import React from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "../styles/Navbar.css"; // Import the CSS file for the Navbar
import Image from "next/image";
import logo from "../../../public/download.png";

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <a href="/">
            <Image src={logo} height="60.1" width="140" alt="BotFi" />
          </a>
        </div>
        <div className="navbar-wallet">
          <WalletMultiButton />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
