const BusBoy = require("busboy")
if (process.env.NODE_ENV === "development") {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require("yamlenv").config()
}

const mailer = require("./lib/mailer")

exports.handler = (req, res) => {
  // Enable CORS:
  res.set("Access-Control-Allow-Origin", "*")
  res.set("Access-Control-Allow-Methods", "GET, POST")

  const busboy = new BusBoy({ headers: req.headers })
  const fields = {}
  const attachment = {
    filename: "",
    content: null
  }
  let subject = "[[Form Submission Notification]]"

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    attachment.filename = filename
    const bufs = []
    file.on("data", (data) => {
      bufs.push(data)
    })
    file.on("end", () => {
      attachment.content = Buffer.concat(bufs)
    })
    file.on("error", () => {
      res.writeHead(500)
      return res.end("INVALID FILE!!")
    })
  })
  busboy.on("field", (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) => {
    if (fieldname === "ls-mail-subject") {
      subject = val
    } else {
      fields[fieldname] = val
    }
  })
  busboy.on("finish", async () => {
    console.log("==> Done parsing form!")
    try {
      await mailer("form-submitted", {
        to: process.env.RECEIVER_EMAILS,
        subject,
        locals: { fields },
        attachments: (attachment.filename === "") ? [] : [attachment],
        send: (process.env.NODE_ENV !== "development")
      })
    } catch (err) {
      console.log("==> Email sending error: ", err)
      res.writeHead(500)
      return res.end("NOT OK!!")
    }
    res.writeHead(200)
    return res.end("OK!!")
  })
  busboy.on("error", (err) => {
    console.log("==> BusBoy error: ", err)
    res.writeHead(500)
    return res.end("OH NOES!!")
  })
  busboy.end(req.rawBody)
}
