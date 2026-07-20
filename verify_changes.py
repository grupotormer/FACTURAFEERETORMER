import time
from playwright.sync_api import sync_playwright, expect

def run_verification(page):
  # Capture console logs
  page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.text}"))

  print("1. Navigating to App Sheep website...")
  page.goto("http://localhost:3000")
  page.wait_for_load_state("networkidle")

  # Clear local storage to re-seed with dollars
  page.evaluate("localStorage.clear();")
  page.reload()
  page.wait_for_load_state("networkidle")

  # Wait for background sync to complete to ensure real products are loaded
  print("Waiting 3 seconds for background sync to complete...")
  page.wait_for_timeout(3000)

  # Open Create Modal
  print("3. Clicking 'Nueva Preventa' button...")
  page.get_by_role("button", name="Nueva Preventa").click()
  page.wait_for_timeout(500) # wait for animation

  # Fill Customer Name and contact
  print("4. Filling customer info...")
  page.locator("#form-cliente").fill("CLIENTE PRUEBA JULES PLAYWRIGHT")
  page.locator("#form-telefono").fill("+34 677 888 999")

  # Open product searchable dropdown for first row
  print("5. Opening searchable product dropdown...")
  page.locator("#product-display-0").click()
  page.wait_for_timeout(300)

  # Type inside writable search input
  print("6. Typing in product search input...")
  page.locator("#product-display-0").fill("PRI-000233")
  page.wait_for_timeout(500)

  # Select first filtered option
  print("7. Selecting PRI-000233 option...")
  page.locator("#product-options-0 >> text=PRI-000233").click()
  page.wait_for_timeout(300)

  # Fill decimal quantity
  print("7b. Filling decimal quantity...")
  page.locator("#form-row-0 input[oninput*='cantidad']").fill("1.5")
  page.wait_for_timeout(300)

  # Check that price is populated
  price_val = page.locator("#form-row-0 input[type='number'][step='0.01']").input_value()
  print(f"-> Selected product price: {price_val} $")

  # Take screenshot of the filled form
  page.screenshot(path="filled_form.png")

  # Submit form
  print("8. Saving preventa...")
  page.get_by_role("button", name="Guardar Preventa").click()
  page.wait_for_timeout(2000) # wait for API sync & local cache refresh

  # Open Details Modal for newly created pre-sale (first row in list)
  print("9. Opening details/ticket view modal for the newly created pre-sale...")
  # First row action button (the first eye icon in table)
  page.locator("table tbody tr").first.locator("button").first.click()
  page.wait_for_timeout(1000) # wait for modal animation

  # Take final verification screenshot focusing on the receipt preview
  print("10. Taking final screenshot of the receipt preview...")
  page.screenshot(path="verification.png")
  print("-> Verification screenshot saved at verification.png")

if __name__ == "__main__":
  # Create verification folder
  import os
  os.makedirs("/home/jules/verification", exist_ok=True)

  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
      run_verification(page)
    finally:
      browser.close()
