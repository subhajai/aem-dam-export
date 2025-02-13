# AEM Asset Export Script  

This script exports assets from Adobe Experience Manager (AEM) Digital Asset Management (DAM).  

🔗 **Reference**: [Adobe Experience League - Exporting Assets](https://experienceleague.adobe.com/en/docs/experience-manager-learn/assets/sharing/export)  

## 🚀 Getting Started  

### 1️⃣ Configure Environment Variables  

Create a `.env` file and add the following configurations:  

```ini
AEM_HOST # The AEM instance URL  
AEM_IMS_HOST # basically it is 'https://ims-na1.adobelogin.com' 
AEM_ASSETS_FOLDER # Path to the assets folder in AEM  
LOCAL_DOWNLOAD_FOLDER # Destination for downloaded assets  
MAX_CONCURRENT_DOWNLOADS # Max simultaneous downloads (default: 10)  
AEM_CLIENT_ID #Your Client ID
AEM_CLIENT_SECRET #Your Client Secret
AEM_TECHNICAL_ACCOUNT_ID #Your Technical Account ID
AEM_ORG_ID #Your Org ID
AEM_PRIVATE_KEY #Your Private Key
```  

🔹 Follow the [reference link](https://experienceleague.adobe.com/en/docs/experience-manager-learn/assets/sharing/export) to generate the required credentials.  

### 2️⃣ Generating Access Tokens  

The script automatically generates an access token via `export-assets.js`.  
Alternatively, you can manually generate one using the `aem-access.js` module.  

### 3️⃣ Running the Script  

Run the following command to start the export:  

```sh
npm start
```  

## 🛠️ Dependencies  

Ensure you have **Node.js** and required dependencies installed:  

```sh
npm install
``` 
