from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local development server
        page.goto("http://localhost:3000")

        # Wait for the main layout and sidebar to be visible
        sidebar_header = page.get_by_text("Providers")
        expect(sidebar_header).to_be_visible(timeout=10000)

        # Also wait for the prompt input card to be visible
        prompt_header = page.get_by_text("Enter Prompt")
        expect(prompt_header).to_be_visible()

        # Give a little time for animations or effects to settle
        page.wait_for_timeout(500)

        # Take a screenshot of the page
        page.screenshot(path="jules-scratch/verification/ui_revamp.png")

        browser.close()

if __name__ == "__main__":
    run_verification()
