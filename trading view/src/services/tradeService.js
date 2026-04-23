export async function placeTrade({ coin, isLong, size, leverage }) {
    const res = await fetch("http://localhost:3000/trade", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            coin,
            isLong,
            size,
            leverage
        })
    });

    return res.json();
}