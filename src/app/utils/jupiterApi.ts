import axios from 'axios';
import { PublicKey, TransactionInstruction, Connection, AddressLookupTableAccount } from '@solana/web3.js';

export async function getQuote(inputMint: string, outputMint: string, amount: number, slippage: number) {
    const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://quote-api.jup.ag/v6/quote',
        headers: {
            'Accept': 'application/json'
        },
        params: {
            inputMint,
            outputMint,
            amount,
            slippageBps: slippage * 100, // slippage in basis points
        }
    };

    try {
        const response = await axios.request(config);
        console.log('Response from Jupiter API:', response.data);

        if (response.data) {
            return response.data;
        } else {
            console.error('No quote data found');
            return null;
        }
    } catch (error) {
        console.error('Error getting quote:', error);
        return null;
    }
}

export async function getSwapInstructions(quoteResponse: any, userPublicKey: string) {
    const data = JSON.stringify({
        quoteResponse: quoteResponse,
        userPublicKey: userPublicKey,
    });

    console.log('Request payload for Jupiter Swap Instructions API:', data);

    const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://quote-api.jup.ag/v6/swap-instructions',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        data: data
    };

    try {
        const response = await axios.request(config);
        console.log('Response from Jupiter Swap Instructions API:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error getting swap instructions:', error);
        throw error; // Rethrow error to handle it in the caller
    }
}

export const deserializeInstruction = (instruction: any) => {
    return new TransactionInstruction({
        programId: new PublicKey(instruction.programId),
        keys: instruction.accounts.map((key: any) => ({
            pubkey: new PublicKey(key.pubkey),
            isSigner: key.isSigner,
            isWritable: key.isWritable,
        })),
        data: Buffer.from(instruction.data, "base64"),
    });
};

export const getAddressLookupTableAccounts = async (connection: Connection, keys: string[]): Promise<AddressLookupTableAccount[]> => {
    const addressLookupTableAccountInfos = await connection.getMultipleAccountsInfo(
        keys.map((key) => new PublicKey(key))
    );

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
        const addressLookupTableAddress = keys[index];
        if (accountInfo) {
            const addressLookupTableAccount = new AddressLookupTableAccount({
                key: new PublicKey(addressLookupTableAddress),
                state: AddressLookupTableAccount.deserialize(accountInfo.data),
            });
            acc.push(addressLookupTableAccount);
        }

        return acc;
    }, new Array<AddressLookupTableAccount>());
};

export async function getSwapTransaction(quoteResponse: any, userPublicKey: string) {
    const data = JSON.stringify({
        quoteResponse: quoteResponse,
        userPublicKey: userPublicKey,
        wrapAndUnwrapSol: true,
    });

    console.log('Request payload for Jupiter Swap Transaction API:', data);

    const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://quote-api.jup.ag/v6/swap',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        data: data
    };

    try {
        const response = await axios.request(config);
        console.log('Response from Jupiter Swap Transaction API:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error getting swap transaction:', error);
        throw error; // Rethrow error to handle it in the caller
    }
}
