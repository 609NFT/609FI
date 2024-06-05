import React from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "../styles/Navbar.css"; // Import the CSS file for the Navbar

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <a href="/">SoloFi</a>
        </div>
        <div className="navbar-wallet">
          <WalletMultiButton />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
