# Setting up online student payments

The payment page is `academics/payments.html` (www.icscanada.edu/academics/payments).
A student enters their name, email, what they're paying for and the amount, then
pays through PayPal, either with a PayPal account or as a guest by card. After that:

- a row is added to a Google Sheet called **ICS Student Payments**;
- the student gets an emailed receipt;
- the Academic Registrar gets a copy with the PayPal details.

Behind the page is a small Google Apps Script program, `student-payments.gs`, in the
same folder as this guide. These steps put that program online and connect the page to it.

Until step 6 is done, the page tells students that online payment isn't available yet
and gives them the Registrar's email address. Publishing the page before setup is safe.

> **Do every step while signed in to Google as `ics-communications@icscanada.edu`.**
> The emails are sent from this account, and the Sheet belongs to it. In Chrome, check
> the round picture at the top right of the screen before you start.

---

## 1. Create the project

1. Go to <https://script.google.com> and click **New project**.
2. Click **Untitled project** at the top left and rename it **ICS Student Payments**.
3. Delete everything in the editor (`function myFunction() {}`).
4. Open `_scripts/student-payments.gs` from this repository, copy all of it, and paste
   it into the editor.
5. Click the **Save** icon (the floppy disk).

## 2. Set the time zone

1. Click the **gear icon** (Project Settings) on the left.
2. Under **Time zone**, choose **(GMT-05:00) Eastern Time - Toronto**.
3. Tick **Show "appsscript.json" manifest file in editor**. You won't need to edit it,
   but this makes the time-zone setting easy to check later.

## 3. Run setup and give permission

1. Go back to the **Editor** (the `< >` icon on the left).
2. In the toolbar, open the function menu (it may say `doGet`) and choose **setup**.
3. Click **Run**.
4. Google asks for permission. Click **Review permissions** and choose the
   `ics-communications@icscanada.edu` account.
5. You'll see **"Google hasn't verified this app."** This is expected: the app is
   ICS's own and was never sent to Google for review. Click **Advanced**, then
   **Go to ICS Student Payments (unsafe)**.
6. Click **Allow**. The program asks to manage Drive files and Sheets (for the
   payments sheet), send email as you (for the receipts), and connect to an external
   service (for PayPal).
7. When it finishes, the **Execution log** at the bottom shows:
   - a link to the new **ICS Student Payments** folder in Google Drive;
   - a link to the Sheet inside it;
   - that the folder is shared with `academic-registrar@icscanada.edu`;
   - a PayPal line. Until step 9 is done, it says payments are **NOT checked
     automatically**. That's fine for now.

Running **setup** again is harmless. It reuses the folder and Sheet it already made.

## 4. Put it online (deploy)

1. Click **Deploy** (top right), then **New deployment**.
2. Click the gear next to **Select type** and choose **Web app**.
3. Fill in:
   - **Description:** `Student payments`
   - **Execute as:** **Me (ics-communications@icscanada.edu)**
   - **Who has access:** **Anyone**

   "Anyone" means the payment page can reach the program. It doesn't give anyone
   access to the Sheet, your Drive or your email.
4. Click **Deploy**.
5. Copy the **Web app URL**. It ends in `/exec`. Keep it handy for step 6.

## 5. Check it's working

Paste the `/exec` URL into a new browser tab. You should see something like:

```
{"ok":true,"service":"ICS payment","storage":"ready","paypal":"not checked automatically"}
```

If `storage` says `not set up: run setup()`, go back to step 3.

## 6. Connect the page

1. In this repository, open `js/payments.js`.
2. Near the top, find:

   ```js
   SCRIPT_URL: '',
   ```

3. Paste your URL between the quotes:

   ```js
   SCRIPT_URL: 'https://script.google.com/macros/s/AKfy…/exec',
   ```

4. Save and commit the change. When the site updates, the page shows the payment form
   instead of the "not available yet" notice.

## 7. Test with one real payment, then refund it

PayPal live accounts have no test mode, so test with a real, small payment.

1. Open www.icscanada.edu/academics/payments.
2. Use your own name and an email you can check. Choose **Other**, type `Test payment`,
   and enter **5** (the smallest amount allowed).
3. Pay with **Debit or Credit Card** or a PayPal account.
4. Check that:
   - the page shows **"Thank you. Your payment is complete."** with a reference such
     as `PAY-261014-K7QM`;
   - your email has a receipt titled **Your ICS payment receipt (PAY-…)**;
   - `academic-registrar@icscanada.edu` received **Payment received: CAD $5.00 from …**;
   - the Sheet has a new row.
5. Refund it: sign in to PayPal (business account) → **Activity** → find the payment →
   **Issue a refund**.
6. In the Sheet, write `Test (refunded)` in the **Payment status** cell of that row.

## Day to day: what the Payment status column means

| Status | What it means | What to do |
|---|---|---|
| **Paid** | PayPal confirmed the amount, the currency and the reference, and the money has arrived. | Nothing. Apply it to the student's account. |
| **Payment pending** | PayPal took the payment but is holding it, usually for a review or an eCheque. | Wait until PayPal shows it as completed before applying it. |
| **CHECK PAYMENT** | The payment wasn't checked automatically: either automatic checks are off (step 9), or PayPal couldn't be reached at that moment. | In PayPal, find the **PayPal order ID** from the row, confirm that the amount arrived, then change the cell to **Paid**. |

The Registrar's email says the same thing. When a payment needs checking, **CHECK
PAYMENT** appears in the subject line and in a red box at the top of the email.

If a student says the page told them their payment couldn't be recorded, they have
**not** been charged twice. Their email to the Registrar includes the PayPal order ID
and the reference. Find the order in PayPal and add a row to the Sheet by hand.
`ics-communications@icscanada.edu` also gets an email with the full details whenever
saving a payment fails.

## 8. Changing the program later

If you edit the code in the Apps Script editor, the website keeps using the old version
until you publish the new one. To publish it **without changing the URL**:

1. **Deploy** → **Manage deployments**.
2. Select the **Student payments** deployment and click the **pencil** (Edit).
3. Under **Version**, choose **New version**.
4. Click **Deploy**.

Don't use **New deployment** for an update. It makes a new URL, and the page would
still be pointing at the old one.

Keep `_scripts/student-payments.gs` in this repository in step with what's in the
editor, so the next person starts from the right code.

## 9. Turning on automatic PayPal checks

With automatic checks on, the program asks PayPal to confirm every payment before
marking it **Paid**. It needs the **secret** of ICS's existing PayPal app, the same app
the other ICS forms use.

> **Don't create a new secret** and don't click anything that regenerates it. The
> other ICS forms use the current secret, and a new one would break them.

1. Go to <https://developer.paypal.com> and log in with the ICS PayPal business account.
2. Make sure the toggle at the top says **Live**, not Sandbox.
3. Open **Apps & Credentials** and find the app whose **Client ID** starts with
   `AdZ0cWK3Bl7…`.
4. Under **Secret key**, click **Show** (or the copy icon next to the existing key).
5. In the Apps Script editor, click the **gear icon** (Project Settings) → **Script
   properties** → **Add script property**:
   - **Property:** `PAYPAL_SECRET`
   - **Value:** the secret you copied
6. Click **Save script properties**.
7. Go back to the **Editor**, choose **setup**, and click **Run**. The PayPal line in the
   log should now say **checked automatically (signed in to PayPal OK)**.
8. Open the `/exec` URL again. It should say `"paypal":"checked automatically"`.

You don't need to redeploy for this. Script properties take effect immediately.

The secret stays in Script properties only. Never paste it into `student-payments.gs`,
`js/payments.js`, an email or anywhere on the website.

## Settings that must match

Two settings files must agree. If you change one of these values, change it in both
files, then commit the website change and publish a new version (step 8):

| Setting | `js/payments.js` (CONFIG) | `_scripts/student-payments.gs` (CONFIG) |
|---|---|---|
| Smallest payment | `MIN_AMOUNT: 5` | `MIN_AMOUNT: 5` |
| Largest payment | `MAX_AMOUNT: 20000` | `MAX_AMOUNT: 20000` |
| Currency | `CURRENCY: 'CAD'` | `CURRENCY: 'CAD'` |
| PayPal app | `PAYPAL_CLIENT_ID` | `PAYPAL_CLIENT_ID` |
| Payment name | `SERVICE: 'ICS payment'` | `SERVICE: 'ICS payment'` |

The choices in **What it's for** live in `academics/payments.html` (the `<select>`)
and in `PURPOSES` in the `.gs` file. They must match word for word.

The Registrar's address appears in `academics/payments.html`, `js/payments.js`
(`REGISTRAR`) and the `.gs` file (`REGISTRAR`). Failure alerts go to `ADMIN` in the
`.gs` file.
