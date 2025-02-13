import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv-flow';
import getAccessToken from './aem-access.js';
import PQueue from 'p-queue';

// Do not process the contents of these well-known AEM system folders
const SKIP_FOLDERS = ['/content/dam/appdata', '/content/dam/projects', '/content/dam/_CSS', '/content/dam/_DMSAMPLE'];

/**
 * Determine if the folder should be processed based on the entity and AEM path.
 *
 * @param {Object} entity the AEM entity that should represent a folder returned from AEM Assets HTTP API
 * @param {String} aemPath the path in AEM of this source
 * @returns true if the entity should be processed, false otherwise
 */
/***** SCRIPT CONFIGURATION *****/
dotenv.config({
    node_env: process.env.NODE_ENV || 'development'
});

const AEM_HOST = process.env.AEM_HOST;
const AEM_ASSETS_FOLDER = process.env.AEM_ASSETS_FOLDER;
const LOCAL_DOWNLOAD_FOLDER = process.env.LOCAL_DOWNLOAD_FOLDER;
const AEM_ACCESS_TOKEN = await getAccessToken.tokenize();
const MAX_CONCURRENT_DOWNLOADS = parseInt(process.env.MAX_CONCURRENT_DOWNLOADS, 10) || 10;

const queue = new PQueue({ concurrency: MAX_CONCURRENT_DOWNLOADS });

function isValidFolder(entity, aemPath) {
    console.log(`Checking if valid folder: ${aemPath}`);
    if (aemPath === '/content/dam') {
        return true;
    } else if (!entity.class.includes('assets/folder')) {
        return false;
    } if (SKIP_FOLDERS.find((path) => path === aemPath)) {
        return false;
    } else if (entity.properties.hidden) {
        return false;
    }

    return true;
}

/**
 * Determine if the entity is downloadable.
 * @param {Object} entity the AEM entity that should represent an asset returned from AEM Assets HTTP API
 * @returns true if the entity is downloadable, false otherwise
 */
function isDownloadable(entity) {
    console.log(`Checking if downloadable: ${entity.properties.name}`);
    if (entity.class.includes('assets/folder')) {
        return false;
    } else if (entity.properties.contentFragment) {
        return false;
    }

    return true;
}

/**
 * Helper function to get the link from the entity based on the relationship name.
 * @param {Object} entity the entity from the AEM Assets HTTP API
 * @param {String} rel the relationship name
 * @returns
 */
function getLink(entity, rel) {
    return entity.links.find(link => link.rel.includes(rel));
}

/**
 * Helper function to fetch JSON data from the AEM Assets HTTP API.
 * @param {String} url the AEM Assets HTTP API URL to fetch data from
 * @returns the JSON response of the AEM Assets HTTP API
 */
async function fetchJSON(url) {
    console.log(`Fetching JSON from: ${url}`);
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${AEM_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
    }

    return response.json();
}

/**
 * Helper function to download a file from AEM Assets.
 * @param {String} url the URL of the asset rendition to download
 * @param {String} outputPath the local path to save the downloaded file
 */
async function downloadFile(url, outputPath) {
    try {
        console.log(`Downloading file from: ${url}`);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AEM_ACCESS_TOKEN}`,
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        await fs.writeFile(outputPath, Buffer.from(arrayBuffer));

        console.log(`Downloaded asset: ${outputPath}`);
    } catch (error) {
        console.error(`Error downloading file ${outputPath}: ${error.message}`);
        throw error; // Re-throw error to handle retries
    }
}

/**
 * Main entry
 * @param {Object} options the options for downloading assets
 * @param {String} options.folderUrl the URL of the AEM folder to download
 * @param {String} options.localPath the local path to save the downloaded assets
 * @param {String} options.aemPath the AEM path of the folder to download
 */
async function downloadAssets({ apiUrl, localPath = LOCAL_DOWNLOAD_FOLDER, aemPath = AEM_ASSETS_FOLDER }) {
    console.log(`Starting downloadAssets with apiUrl: ${apiUrl}, localPath: ${localPath}, aemPath: ${aemPath}`);
    if (!apiUrl) {
        const prefix = "/content/dam/";
        let apiPath = aemPath.startsWith(prefix) ? aemPath.substring(prefix.length) : aemPath;

        if (!apiPath.startsWith('/')) {
            apiPath = '/' + apiPath;
        }

        apiUrl = `${AEM_HOST}/api/assets${apiPath}.json`
    }

    const data = await fetchJSON(apiUrl);
    const entities = data.entities || [];

    // Process folders first
    for (const folder of entities.filter(entity => entity.class.includes('assets/folder'))) {
        const newLocalPath = path.join(localPath, folder.properties.name);
        const newAemPath = path.join(aemPath, folder.properties.name);

        if (!isValidFolder(folder, newAemPath)) {
            continue;
        }

        await fs.mkdir(newLocalPath, { recursive: true });

        await downloadAssets({
            apiUrl: getLink(folder, 'self')?.href,
            localPath: newLocalPath,
            aemPath: newAemPath
        });
    }

    // Process assets
    for (const asset of entities.filter(entity => entity.class.includes('assets/asset'))) {
        const assetLocalPath = path.join(localPath, asset.properties.name);
        if (isDownloadable(asset)) {
            try {
                await fs.access(assetLocalPath);
                console.log(`File already exists: ${assetLocalPath}`);
                continue;
            } catch {
                queue.add(() => downloadFile(getLink(asset, 'content')?.href, assetLocalPath));
            }
        }
    }

    await queue.onIdle();

    const nextUrl = getLink(data, 'next');
    if (nextUrl) {
        await downloadAssets({
            apiUrl: nextUrl?.href,
            localPath,
            aemPath
        });
    }
}

/***** SCRIPT ENTRY POINT *****/

console.time('Download AEM assets');

await downloadAssets({
    aemPath: AEM_ASSETS_FOLDER,
    localPath: LOCAL_DOWNLOAD_FOLDER
}).catch(console.error);

console.timeEnd('Download AEM assets');
