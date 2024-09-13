import express from "express";

const app = express();
const port = 3000;

app.get("/", (req, res) => {
    const today = new Date();
    const day = today.getDate();
    // console.log(day);
    let type = "a weekday";
    let advice = "work herd";

    if (day == 0 || day == 6) {
        let type = "a weekend";
        let advice = "have fun";
    }
    res.render("index.ejs",{daytype:type,advice:advice});
})

app.listen(port, () => {
    console.log("server is running...");
})
