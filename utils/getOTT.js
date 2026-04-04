module.exports = function getOTT(link = "") {
    if (!link || link === "/") return "none";
    const l = link.toLowerCase();

    if (l.includes("netflix")) return "netflix";
    if (l.includes("primevideo") || l.includes("amazon")) return "prime";
    if (l.includes("hotstar")) return "hotstar";

    if (l.includes("zee5")) return "zee5";
    if (l.includes("sonyliv")) return "sonyliv";
    if (l.includes("lionsgate")) return "lionsgateplay";

    return "other";
};