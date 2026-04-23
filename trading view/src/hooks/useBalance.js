import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

export function useBalance() {
    const { address } = useAccount();
    const [balance, setBalance] = useState(null);

    useEffect(() => {
        if (!address) return;

        const fetchBalance = async () => {
            try {
                const res = await fetch(`http://localhost:3000/balance/${address}`);
                const data = await res.json();

                setBalance(data.balance);
            } catch (err) {
                console.log("Balance error:", err);
            }
        };

        fetchBalance();

        const interval = setInterval(fetchBalance, 5000); // refresh

        return () => clearInterval(interval);

    }, [address]);

    return balance;
}