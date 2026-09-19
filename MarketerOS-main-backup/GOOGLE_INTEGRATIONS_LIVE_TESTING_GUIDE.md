# 🌟 Complete Beginner's End-to-End Live Testing Guide
## MarketerOS: Dynamic Google Multi-Channel Platform (100% BYOK)

> **Welcome!** If you are brand new to MarketerOS or Google APIs, this guide is written especially for you.  
> It walks you through **every single step**, telling you **which page to open**, **which button to click**, and **what exact values to type into each box**.

---

## 📌 Table of Contents
1. [What is This Platform?](#1-what-is-this-platform)
2. [Prerequisite: How to Get Your Google Credentials (Takes 3-5 Mins)](#2-prerequisite-how-to-get-your-google-credentials)
   - [Part A: Google Ads (Customer ID, Developer Token, OAuth Client ID/Secret, Refresh Token)](#part-a-google-ads-credentials)
   - [Part B: Google Analytics 4 & Search Console (Service Account JSON)](#part-b-service-account-json-for-ga4--search-console)
3. [Step 1: Sign Up & Create Your Workspace](#step-1-sign-up--create-your-workspace)
4. [Step 2: Navigate to the Integrations Page](#step-2-navigate-to-the-integrations-page)
5. [Step 3: Connect Your Google Accounts (Card by Card)](#step-3-connect-your-google-accounts)
   - [3A: Connect Google Ads](#3a-connect-google-ads)
   - [3B: Connect Google Analytics 4](#3b-connect-google-analytics-4)
   - [3C: Connect Google Search Console](#3c-connect-google-search-console)
   - [3D: Connect Firebase & AdMob](#3d-connect-firebase--admob)
6. [Step 4: Explore the Live Google Hub Telemetry Dashboard](#step-4-explore-the-live-google-hub)
7. [Step 5: Create a Live Campaign Directly into Your Google Ads Account](#step-5-create-a-live-campaign-directly-into-google-ads)
8. [Troubleshooting & Common Questions](#troubleshooting--common-questions)

---

## 1. What is This Platform?

MarketerOS is a centralized growth and marketing analytics platform. It allows you to:
1. Connect all your Google tools (**Google Ads**, **Google Analytics 4**, **Google Search Console**, and **Firebase / AdMob**) in one place.
2. View real-time traffic, ad spend, search query rankings, and mobile app ad earnings on a single unified screen.
3. Create real ad campaigns that publish **directly into your personal Google Ads account** with one click.

### 🛡️ Core Rule: 100% BYOK (Bring Your Own Keys)
- The platform uses **zero hardcoded keys** and **zero mock data**.
- All queries and actions run directly against your actual Google accounts using the credentials you provide.
- Your credentials are encrypted on your local server using **AES-256-GCM** before being stored.

---

## 2. Prerequisite: How to Get Your Google Credentials

If you already have your credentials, you can skip straight to [Step 1](#step-1-sign-up--create-your-workspace). If you don't, follow these simple steps:

### Part A: Google Ads Credentials

You will need 5 pieces of information for Google Ads:

#### 1. Customer ID (10 digits)
- Open [ads.google.com](https://ads.google.com) and sign in.
- Look in the **top-right corner** of the screen right next to your profile picture.
- You will see a 10-digit number formatted like `123-456-7890`. That is your **Customer ID**.

#### 2. Developer Token
- In Google Ads, go to your **Manager Account (MCC)**.
- In the top menu, click **Tools and Settings > SETUP > API Center**.
- Copy the **Developer Token** shown on screen (e.g., `QvCJmKacfFBA_M9U1whlZg`).  
  *(Note: A Test Account token or Approved token both work).*

#### 3. OAuth Client ID and Client Secret
- Go to [Google Cloud Console](https://console.cloud.google.com/).
- Select your project (or click **Select a project > New Project**, name it, and click **Create**).
- Enable the Google Ads API:
  - In the search bar at the top, type `Google Ads API` and click on it.
  - Click the blue **Enable** button.
- Configure OAuth Consent Screen:
  - In the left menu, go to **APIs & Services > OAuth consent screen**.
  - Select **External**, fill in **App name** (e.g. `MarketerOS`), your email, and click **Save and Continue** until finished.
- Create Credentials:
  - In the left menu, click **APIs & Services > Credentials**.
  - Click **+ Create Credentials > OAuth client ID**.
  - For **Application type**, choose **Web application**.
  - Under **Authorized redirect URIs**, click **+ Add URI** and enter:  
    `https://developers.google.com/oauthplayground`
  - Click **Create**.
  - A popup will display your **Client ID** (ends in `.apps.googleusercontent.com`) and **Client Secret**. Copy both!

#### 4. OAuth Refresh Token (Takes 60 seconds)
- Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
- In the top right corner, click the **⚙️ (gear icon)** to open the configuration panel.
- Check the checkbox: **"Use your own OAuth credentials"**.
- Paste your **OAuth Client ID** and **OAuth Client Secret** into the inputs.
- On the left side under **Step 1 Select & authorize APIs**:
  - In the input box labeled "Input your own scopes", enter:  
    `https://www.googleapis.com/auth/adwords`
  - Click the blue **Authorize APIs** button.
- Sign in with your Google account and click **Continue / Allow**.
- You will be sent back to the Playground under **Step 2**.
- Click the blue button labeled **Exchange authorization code for tokens**.
- Look at the text box labeled **Refresh token**. It starts with `1//`. Copy this entire string!

---

### Part B: Service Account JSON (For GA4 & Search Console)

A single Google Cloud Service Account can be used for Google Analytics 4, Search Console, and AdMob:

1. In [Google Cloud Console](https://console.cloud.google.com/), go to **IAM & Admin > Service Accounts**.
2. Click **+ Create Service Account**. Name it `marketeros-sync` and click **Create and Continue**, then click **Done**.
3. In the list, click on the service account you just created.
4. Click the **Keys** tab at the top.
5. Click **Add Key > Create new key**. Select **JSON** and click **Create**.
6. A `.json` file will download to your computer. Open it in Notepad — you will paste this entire text into MarketerOS!
7. **One-Time Permissions Setup**:
   - Copy the `client_email` inside the JSON file (e.g. `marketeros-sync@your-project.iam.gserviceaccount.com`).
   - **For GA4**: Go to [analytics.google.com](https://analytics.google.com) > **Admin (gear icon) > Property Access Management > + > Add users** > Paste the email and assign **Viewer** role. Also note your **GA4 Property ID** from **Property Settings** (9 digits).
   - **For Search Console**: Go to [search.google.com/search-console](https://search.google.com/search-console) > **Settings > Users and permissions > Add user** > Paste the email with **Full** or **Restricted** access.
   - **In Google Cloud Console**: Enable **Google Analytics Data API** and **Google Search Console API** in the API Library.

---

## Step 1: Sign Up & Create Your Workspace

### 🌐 Where to Go:
Open your browser and navigate to:  
👉 **`http://localhost:3000/signup`**

### 📝 What to Fill In:
You will see the **Create your account** form. Enter the following:

| Field Label on Screen | What to Type | Description |
| :--- | :--- | :--- |
| **Full Name** | `Alex Rivera` | Your name. |
| **Workspace Name** | `Apex Growth Agency` | Name of your agency, company, or brand. |
| **Work Email** | `alex@growthagency.com` | Your email address (used for logging in). |
| **Password** | `MarketerOS2026!` | Any password with at least 8 characters. |

### 🔘 What to Press:
- Click the black button at the bottom: **`[ Create Account ]`**.
- **What happens**: Your user account and dedicated workspace are created. You are automatically logged in and redirected to the **Main Dashboard** (`http://localhost:3000/`).

---

## Step 2: Navigate to the Integrations Page

### 🧭 How to Get There:
1. Look at the **navigation sidebar** on the far left of your screen.
2. Find the menu item labeled **`Integrations`** (with a plug/link icon) and click it.  
   *(Or simply type `http://localhost:3000/integrations` into your browser's address bar).*
3. You are now on the **Platform Integrations** page!

### 🔍 Understanding the Screen:
- At the top right, you will see two view mode buttons:
  - **`Directory View`** (Selected by default — shows cards for all advertising platforms).
  - **`⚡ Live Google Hub`** (A unified live dashboard showing real-time metrics).
- You will see cards for **Google Ads**, **Google Analytics**, **Google Search Console**, **Firebase (AdMob)**, Meta Ads, TikTok, etc.

---

## Step 3: Connect Your Google Accounts

---

### 3A: Connect Google Ads

1. Make sure you are on **Directory View**.
2. Find the **Google Ads** card (has the Google Ads logo and a purple `BYOK Direct` badge).
3. Click the dark button on the card: **`[ Connect ]`** (or **`[ Configure ]`** if previously opened).
4. The **Google Ads (BYOK)** modal pops up on your screen.

#### 📝 Fill In Each Field in the Modal:

| Field Label in Modal | Example Value to Type / Paste | Notes |
| :--- | :--- | :--- |
| **Account Label / Friendly Name** | `My Main Google Ads` | Any nickname for this account. |
| **Customer ID** <span style="color:red">*</span> | `123-456-7890` | Your 10-digit Google Ads ID (with or without dashes). |
| **Developer Token** <span style="color:red">*</span> | `QvCJmKacfFBA_M9U1whlZg` | From Google Ads MCC > API Center. *(Click the eye icon to reveal)*. |
| **OAuth Client ID** <span style="color:red">*</span> | `668979121407-npcfjsh2ckhuvcbd2dtmk0dheh7aeb18.apps.googleusercontent.com` | From Google Cloud Console Credentials. |
| **OAuth Client Secret** <span style="color:red">*</span> | `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` | Matching client secret from Google Cloud. |
| **OAuth Refresh Token** <span style="color:red">*</span> | `1//04xxxxxxxxxxxxxxxxxxxxxxxxx` | Starts with `1//`. Generated via OAuth Playground. |
| **Login Customer ID (MCC)** | `915-288-8043` *(or leave blank)* | Only enter this if your account is managed under an MCC hierarchy. Otherwise leave blank! |

#### 🔘 Buttons to Press (In Order):
1. **First, click the left button:** **`[ Test Live Connection ]`** (with refresh icon):
   - MarketerOS contacts Google Ads servers live with your credentials.
   - **Expected Result**: A green banner appears at the bottom of the modal:  
     `✅ Live Connection Verified! Successfully connected to My Main Google Ads (1234567890)`.
2. **Next, click the blue button:** **`[ Save & Connect ]`** (with sparkle icon):
   - Your credentials are encrypted using AES-256-GCM and saved securely.
   - The modal automatically closes.
   - The Google Ads card now displays a green **`Connected`** badge!

---

### 3B: Connect Google Analytics 4

1. On the Integrations page, find the **Google Analytics** card.
2. Click the button: **`[ Connect ]`**.
3. The **Google Analytics 4 (BYOK)** modal appears.

#### 📝 Fill In Each Field:

| Field Label in Modal | Example Value to Type / Paste | Notes |
| :--- | :--- | :--- |
| **Account Label / Friendly Name** | `Production Website GA4` | Any nickname. |
| **GA4 Property ID** <span style="color:red">*</span> | `312984712` | Exactly 9 numeric digits from GA4 Admin > Property Settings. |
| **Authentication Method** | Select **`Service Account JSON`** | Click the card labeled **Service Account JSON** (Recommended). |
| **Service Account Key (JSON)** <span style="color:red">*</span> | *(Paste your entire downloaded `.json` key file)* | Open your downloaded JSON key in Notepad, press Ctrl+A then Ctrl+C, and paste it here. |
| **Measurement Protocol Secret** | *(Leave blank)* | Optional, only used for server-side custom events. |

#### 🔘 Buttons to Press:
1. Click **`[ Test Live Connection ]`**.
   - **Expected Result**: Green confirmation banner: `✅ Live Connection Verified! Successfully connected to GA4 Property (312984712)`.
2. Click **`[ Save & Connect ]`**.
   - The card status turns to **`Connected`**!

---

### 3C: Connect Google Search Console

1. On the Integrations page, find the **Google Search Console** card.
2. Click **`[ Connect ]`**.
3. The **Google Search Console (BYOK)** modal appears.

#### 📝 Fill In Each Field:

| Field Label in Modal | Example Value to Type / Paste | Notes |
| :--- | :--- | :--- |
| **Account Label / Friendly Name** | `Main Website Search Console` | Any nickname. |
| **Site URL / Domain Resource** <span style="color:red">*</span> | `https://yourwebsite.com/` | Enter the exact URL prefix (e.g. `https://yourwebsite.com/`) or domain (e.g. `sc-domain:yourwebsite.com`) registered in Search Console. |
| **Authentication Method** | Select **`Service Account JSON`** | Click **Service Account JSON**. |
| **Service Account Key (JSON)** <span style="color:red">*</span> | *(Paste the same Service Account JSON from 3B)* | You can reuse the exact same JSON key file! (Ensure the service account email is added as a user in Search Console). |

#### 🔘 Buttons to Press:
1. Click **`[ Test Live Connection ]`**.
   - **Expected Result**: Green confirmation banner: `✅ Live Connection Verified! Successfully verified site: https://yourwebsite.com/`.
2. Click **`[ Save & Connect ]`**.
   - The card status turns to **`Connected`**!

---

### 3D: Connect Firebase & AdMob

1. On the Integrations page, find the **Firebase** card (labeled Firebase & AdMob).
2. Click **`[ Connect ]`**.
3. The **Firebase & AdMob (BYOK)** modal appears.

#### 📝 Fill In Each Field:

| Field Label in Modal | Example Value to Type / Paste | Notes |
| :--- | :--- | :--- |
| **Account Label / Friendly Name** | `Mobile Apps AdMob` | Any nickname. |
| **AdMob Publisher ID** <span style="color:red">*</span> | `pub-1234567890123456` | Starts with `pub-` followed by 16 digits. Found in AdMob > Settings > Account Information. |
| **Authentication Method** | Select **`Service Account JSON`** | Click **Service Account JSON**. |
| **Service Account Key (JSON)** <span style="color:red">*</span> | *(Paste your Service Account JSON)* | Service account with AdMob API enabled. |

#### 🔘 Buttons to Press:
1. Click **`[ Test Live Connection ]`**.
2. Click **`[ Save & Connect ]`**.

---

## Step 4: Explore the Live Google Hub

Now that your accounts are connected, it's time to view your live data!

### 🧭 How to Open the Hub:
1. At the top-right corner of the **Integrations** page, click the blue button:  
   👉 **`[ ⚡ Live Google Hub ]`**
2. The page instantly switches to your unified live command center.

### 📊 Exploring the 5 Channel Tabs:

Look at the tab bar across the top of the Hub:

#### 1. Unified Overview Tab:
- **Google Ads Spend Card**: Shows live total spend and active campaign count.
- **GA4 Real-Time Users Card**: Shows a pulsing green dot with the exact number of active visitors on your website right now (last 30 minutes).
- **Organic Clicks Card**: Shows organic Google search clicks and impressions.
- **AdMob Revenue Card**: Shows mobile ad earnings and impression RPM.
- **28-Day Historical Trend Chart**: An interactive chart showing daily active sessions.

#### 2. Google Ads Tab:
- A live table listing every single real campaign inside your Google Ads account.
- Displays Campaign Name, Status (`ENABLED` or `PAUSED`), Channel (`SEARCH` or `DISPLAY`), Daily Budget, Clicks, Spend, and Click-Through Rate.

#### 3. Google Analytics (GA4) Tab:
- Real-time active user gauge.
- Breakdown of visitors by device (Mobile, Desktop, Tablet).
- Traffic acquisition channels (Organic Search, Direct, Paid Search, Referral).

#### 4. Search Console Tab:
- A live table showing the **exact search terms** people typed into Google Search to find your website.
- Displays Clicks, Impressions, CTR%, and your **exact Google Search ranking position** (e.g. `#1.2`, `#3.0`).

#### 5. Firebase & AdMob Tab:
- Lists your registered Android and iOS apps, approval statuses, and revenue breakdown.

#### 🔄 How to Force an Instant Sync:
- In the top-right of the Hub, click the **`[ Sync Live ]`** button (with rotating arrows icon).
- MarketerOS re-queries Google servers live and refreshes all cards and charts.

---

## Step 5: Create a Live Campaign Directly into Google Ads

Now let's test mutating (creating) an ad campaign in MarketerOS and seeing it appear inside your actual Google Ads account!

### 🎯 Step-by-Step Instructions:
1. Inside the **Live Google Hub**, click on the **`Google Ads`** tab.
2. In the top-right area above the campaigns table, click the blue button:  
   👉 **`[ + Mutate New Campaign ]`**
3. A popup modal titled **Mutate Campaign into Google Ads** opens.

### 📝 Fill In the 3 Fields:
| Field Label on Screen | What to Type / Select | Notes |
| :--- | :--- | :--- |
| **Campaign Name** <span style="color:red">*</span> | `Spring 2026 Promo Live Test` | The name that will appear in your Google Ads account. |
| **Daily Budget (USD)** <span style="color:red">*</span> | `25` | Your daily budget in US dollars (e.g. 25). |
| **Campaign Channel Type** | Select **`Google Search Network`** | Choose Search Network or Display Network. |

### 🔘 What to Press:
- Click the blue button at the bottom: **`[ Mutate into Google Account ]`**.
- Watch the spinner for 1-2 seconds.
- A green confirmation alert appears:  
  `🎉 Campaign "Spring 2026 Promo Live Test" successfully created in your Google Ads account!`
- The modal closes, and the new campaign appears in your table!

### 🔎 Verify on Google's Official Website:
1. Open a new tab in your browser and go to [ads.google.com](https://ads.google.com).
2. Click on **Campaigns** in the left menu.
3. You will see **"Spring 2026 Promo Live Test"** right there in your Google account!  
   *(It is created in `PAUSED` state by default for safety, so you will not be charged until you choose to enable it).*

---

## Troubleshooting & Common Questions

### Q: "Test Live Connection" says `DEVELOPER_TOKEN_NOT_APPROVED`
- **Why**: Your Google Ads Developer Token is still in "Test Account" status or has not been approved for standard access.
- **Fix**: In your Google Ads Manager Account (MCC), ensure your Developer Token is approved, or test against a Google Ads Test Account.

### Q: "Test Live Connection" says `invalid_grant` or `Token has been expired or revoked`
- **Why**: The OAuth Refresh Token was revoked or generated with incorrect scopes.
- **Fix**: Re-visit [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground) with your Client ID & Secret, select `https://www.googleapis.com/auth/adwords`, and generate a fresh Refresh Token.

### Q: "Test Live Connection" on GA4 says `User does not have sufficient permissions`
- **Why**: The Service Account email is not added to your Google Analytics Property.
- **Fix**: In [analytics.google.com](https://analytics.google.com), click **Admin > Property Access Management > Add users**, paste your service account's `client_email`, and grant **Viewer** permissions.

### Q: How do I change my credentials or disconnect an account?
- Go to **Integrations** (`/integrations`).
- On any connected card, click **`Configure`** to edit your credentials, or click the **trash/unlink icon** to disconnect the account.

---

### ✅ You Are All Set!
You now have a complete, dynamic marketing dashboard running live with your Google accounts. Enjoy using MarketerOS!
