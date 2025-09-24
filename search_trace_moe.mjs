// Node 22+ ES Module using axios + form-data + fs
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

const filePath = process.argv[2];
if (!filePath || !fs.existsSync(filePath)) {
    console.error(JSON.stringify({ error: "File does not exist" }));
    process.exit(1);
}

const tempThumbPath = path.join(process.env.TEMP || "/tmp", "thumb_best.png");

async function downloadThumbnail(url, destPath) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(destPath, response.data);
}

async function getAnimeTitle(anilistId) {
    try {
        const query = `
        query ($id: Int) {
            Media(id: $id, type: ANIME) {
                title { romaji english }
            }
        }`;
        const response = await axios.post(
            'https://graphql.anilist.co',
            { query, variables: { id: anilistId } },
            { headers: { 'Content-Type': 'application/json' } }
        );
        const titleObj = response.data.data.Media.title;
        return titleObj.english || titleObj.romaji || "Unknown";
    } catch (e) {
        return "Unknown";
    }
}

async function searchImage(filePath) {
    try {
        const formData = new FormData();
        formData.append('image', fs.createReadStream(filePath), path.basename(filePath));

        const response = await axios.post('https://api.trace.moe/search', formData, {
            headers: formData.getHeaders(),
            maxBodyLength: Infinity
        });

        const results = response.data.result || [];

        if (results.length > 0) {
            const best = results[0];

            // normalize numeric fields
            best.from = Number(best.from) || 0;
            best.to = Number(best.to) || 0;
            best.similarity = Number(best.similarity) || 0;

            // fetch anime title from AniList
            best.title = await getAnimeTitle(best.anilist);

            // download thumbnail if available
            if (best.image) {
                await downloadThumbnail(best.image, tempThumbPath);
                best.thumbPath = tempThumbPath;
            }

            // output clean JSON (no line breaks inside keys, correct keys)
            const cleanResult = {
                result: [{
                    anilist: best.anilist,
                    filename: best.filename,
                    episode: best.episode,
                    from: best.from,
                    to: best.to,
                    similarity: best.similarity,
                    video: best.video || "",
                    image: best.image || "",
                    title: best.title,
                    thumbPath: best.thumbPath || ""
                }]
            };

            console.log(JSON.stringify(cleanResult));
        } else {
            console.log(JSON.stringify({ result: [] }));
        }

    } catch (err) {
        console.error(JSON.stringify({ error: err.message }));
    }
}

searchImage(filePath);







