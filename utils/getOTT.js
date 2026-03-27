module.exports = function getOTT(link = "") {
    const l = link.toLowerCase();

    if (l.includes("netflix")) return "netflix";
    if (l.includes("primevideo")) return "prime";
    if (l.includes("hotstar")) return "hotstar";

    return "other";
};