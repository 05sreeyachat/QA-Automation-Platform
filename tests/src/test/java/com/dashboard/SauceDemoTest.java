package com.dashboard;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.*;

import java.time.Duration;

/**
 * Selenium JUnit 5 tests for https://www.saucedemo.com
 * Tests: Valid Login, Invalid Login, Add to Cart, Checkout
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class SauceDemoTest {

    private static WebDriver driver;
    private static WebDriverWait wait;

    private static final String BASE_URL = "https://www.saucedemo.com";
    private static final String VALID_USER = "standard_user";
    private static final String VALID_PASS = "secret_sauce";

    @BeforeAll
    static void setupAll() {
        // Auto-download and configure ChromeDriver
        WebDriverManager.chromedriver().setup();

        ChromeOptions options = new ChromeOptions();
        // Run headless in CI/server environments
        options.addArguments("--headless=new");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--window-size=1920,1080");

        driver = new ChromeDriver(options);
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    @AfterAll
    static void teardownAll() {
        if (driver != null) {
            driver.quit();
        }
    }

    @BeforeEach
    void navigateToHome() {
        driver.get(BASE_URL);
    }

    /**
     * TEST 1: Valid login with correct credentials
     */
    @Test
    @Order(1)
    @DisplayName("TC-01: Valid Login")
    void testValidLogin() {
        driver.findElement(By.id("user-name")).sendKeys(VALID_USER);
        driver.findElement(By.id("password")).sendKeys(VALID_PASS);
        driver.findElement(By.id("login-button")).click();

        // Verify we landed on the inventory page
        wait.until(ExpectedConditions.urlContains("inventory"));
        Assertions.assertTrue(
            driver.getCurrentUrl().contains("inventory"),
            "Should navigate to inventory page after valid login"
        );
    }

    /**
     * TEST 2: Invalid login with wrong credentials
     */
    @Test
    @Order(2)
    @DisplayName("TC-02: Invalid Login")
    void testInvalidLogin() {
        driver.findElement(By.id("user-name")).sendKeys("wrong_user");
        driver.findElement(By.id("password")).sendKeys("wrong_pass");
        driver.findElement(By.id("login-button")).click();

        // Verify error message appears
        WebElement errorEl = wait.until(
            ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-test='error']"))
        );
        Assertions.assertTrue(
            errorEl.isDisplayed(),
            "Error message should be visible for invalid credentials"
        );
        Assertions.assertTrue(
            errorEl.getText().contains("Username and password do not match"),
            "Error text should mention credentials mismatch"
        );
    }

    /**
     * TEST 3: Add to Cart functionality
     */
    @Test
    @Order(3)
    @DisplayName("TC-03: Add to Cart")
    void testAddToCart() {
        // Login first
        login(VALID_USER, VALID_PASS);
        wait.until(ExpectedConditions.urlContains("inventory"));

        // Click the first "Add to cart" button on the page
        WebElement addBtn = wait.until(
            ExpectedConditions.elementToBeClickable(By.cssSelector(".btn_primary.btn_inventory"))
        );
        addBtn.click();

        // Verify cart badge shows 1 item
        WebElement cartBadge = wait.until(
            ExpectedConditions.visibilityOfElementLocated(By.className("shopping_cart_badge"))
        );
        Assertions.assertEquals("1", cartBadge.getText(), "Cart should show 1 item after adding to cart");
    }

    /**
     * TEST 4: Checkout flow
     */
    @Test
    @Order(4)
    @DisplayName("TC-04: Checkout")
    void testCheckout() {
        // Login
        login(VALID_USER, VALID_PASS);
        wait.until(ExpectedConditions.urlContains("inventory"));

        // Add item to cart
        WebElement addBtn = wait.until(
            ExpectedConditions.elementToBeClickable(By.cssSelector(".btn_primary.btn_inventory"))
        );
        addBtn.click();

        // Go to cart
        driver.findElement(By.className("shopping_cart_link")).click();
        wait.until(ExpectedConditions.urlContains("cart"));

        // Proceed to checkout
        driver.findElement(By.id("checkout")).click();
        wait.until(ExpectedConditions.urlContains("checkout-step-one"));

        // Fill in details
        driver.findElement(By.id("first-name")).sendKeys("QA");
        driver.findElement(By.id("last-name")).sendKeys("Tester");
        driver.findElement(By.id("postal-code")).sendKeys("12345");
        driver.findElement(By.id("continue")).click();

        // Confirm order overview page
        wait.until(ExpectedConditions.urlContains("checkout-step-two"));
        Assertions.assertTrue(
            driver.getCurrentUrl().contains("checkout-step-two"),
            "Should be on checkout step two (order summary)"
        );
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private void login(String username, String password) {
        driver.get(BASE_URL);
        driver.findElement(By.id("user-name")).sendKeys(username);
        driver.findElement(By.id("password")).sendKeys(password);
        driver.findElement(By.id("login-button")).click();
    }
}
