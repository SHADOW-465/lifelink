import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Login
        page.goto("http://localhost:3000/auth/login")
        page.get_by_label("Email").fill("test.user.jules@example.com")
        page.get_by_label("Password").fill("password123")
        page.get_by_role("button", name="Sign In").click()

        # Expect to be redirected to the dashboard
        expect(page).to_have_url(re.compile(r".*/dashboard"))
        expect(page.get_by_role("heading", name=re.compile(r"Welcome,.*"))).to_be_visible()

        # 2. Navigate to Create Request Page
        page.get_by_role("link", name="Request Blood").click()
        expect(page).to_have_url(re.compile(r".*/requests/create"))
        expect(page.get_by_role("heading", name="Create Blood Request")).to_be_visible()

        # 3. Fill out and submit the form
        # Select Blood Type
        page.get_by_role("combobox").first.click()
        page.get_by_role("option", name="A POSITIVE").click()

        # Select Units
        page.locator('button:has-text("1 unit")').click()
        page.get_by_role("option", name="2 units").click()

        # Select Urgency
        page.locator('button:has-text("NORMAL")').click()
        page.get_by_role("option", name="URGENT").click()

        page.get_by_role("button", name="Submit Request").click()

        # 4. Verify the request appears on the dashboard
        expect(page).to_have_url(re.compile(r".*/dashboard"))

        # Look for the card containing the new request
        request_card = page.locator("li", has_text="A POSITIVE - URGENT")
        expect(request_card).to_be_visible()
        expect(request_card.get_by_text("0 / 2 units fulfilled")).to_be_visible()

        # 5. Take Screenshot
        page.screenshot(path="jules-scratch/verification/dashboard_with_request.png")
        print("Screenshot taken successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
    finally:
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)