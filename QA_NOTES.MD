Functionalities

Consumer Role

* In the adding to card quantity should not exceed the quantity of available kg of rice

    * Moreover in the “Cart Screen” it should not be able to exceed the available quantity of rice. Meaning if the maximum is 20kg then it should not go above 20kg in the cart screen and disable the add button.

* There should be no SACKS in quantity all should be in kg for consistency

* When a consumer buys it should update the current availability of the rice in kg. Meaning it should subtract the kg of rice the consumer ordered to the availability of rice

    * In relation to this when availability is reached to 0 automatically add a label in the card saying “Out of Stock” and the card should no longer be clicked unless the farmer adds a new stock to it.

* “N/A” in the “Orders” should be named after the name of the rice you order. For example you ordered a rice named “Testing Rice” the “N/A” should be “Testing Rice”

Consumer Role & Farmer Role

* For the cost of the order on the consumer side the Subtotal, Delivery Fee, Tax (12%) should be accounted for. Adjust the Delivery fee to 20 PHP.

* In the consumers screen, when the order is accepted on the farmer's side. The orders tag should not be “ACCEPTED” but it should be “Out for Delivery” also add a dummy timer for just 10 seconds after that it should be tagged as Delivered. Only then should it update the Earnings. Moreover, in the farmers screen in the orders it should also be tagged as delivered when the order is delivered.

Farmer Role

* Automatically updates the “Earnings” screen when the order is Delivered.
    * Should also be seen in the recent payouts

UI/UX
All Roles
* Make the buttons (In the current screen) highlighted. Making it only color is green makes it barely visible
* Change all emojis in the cards to “lucide icons” so it looks more professional.

Farmer Role
* Change the buttons (edit, stock, deactivate, and archive) in the “Products” screen to look more presentable and professional

Admin Role
* Add an accepted tag in the “Order Monitoring” screen.
* The dashboard should get updates on the Total GMV, Platform Revenue, as well as the Avg Order Value.

* Add a sticky search bar in the “User Management” screen so that the admin can search any users instantly.
* Add also tags in “User Management” screens for the roles, for easy searching.
Payout Management should be updated based on the managed payouts.


Optional:
* Add Dicebear API for images in users

Backend
* Make sure that the images of mock data products are added in the seeding of data.
* Verify if the application works on other devices.
