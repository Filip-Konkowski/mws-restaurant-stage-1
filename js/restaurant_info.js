let restaurant;
var map;
let isOffline;

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
    fetchRestaurantFromURL();
});

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
    fetchRestaurantFromURL((error, restaurant) => {
        fillBreadcrumb(restaurant);
        if (error) { // Got an error!
            console.error(error);
        } else {
            self.map = new google.maps.Map(document.getElementById('map'), {
                zoom: 16,
                center: restaurant.latlng,
                scrollwheel: false
            });
            DBHelper.mapMarkerForRestaurant(restaurant, self.map);
        }
    });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
    if (self.restaurant) { // restaurant already fetched!
        callback(null, self.restaurant)
        return;
    }
    const id = getParameterByName('id');

    if (!id) { // no id found in URL
        error = 'No restaurant id in URL'
        callback(error, null);
    } else {
        let numericalRestaurantId = Number(id);

        if (self.restaurant) { // restaurant already fetched!
            callback(null, self.restaurant)
            return;
        }
        IndexedDBHelper.fetchByIdFromIndexedDB(numericalRestaurantId,(error, restaurant) => {
            if (error || restaurant.length === 0) {
                console.error('IndexDBHelper fetch fails: ',error);
                DBHelper.fetchRestaurantById(numericalRestaurantId, (error, restaurant) => {
                    if (!restaurant || error) {
                        console.error('DB fetch fails: ',error);
                        return callback(error, null)

                    } else {
                        self.isOffline = false;
                        fillRestaurantHTML(restaurant);
                        return callback(null, restaurant)
                    }
                });
            } else {
                self.isOffline = true;
                fillRestaurantHTML(restaurant);
                return callback(null, restaurant)
            }

        });

    }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
    console.log('fillRestaurantHTML', restaurant)
    const name = document.getElementById('restaurant-name');
    name.innerHTML = restaurant.name;
    name.tabIndex = 1;

    const address = document.getElementById('restaurant-address');
    address.innerHTML = restaurant.address;

    const picture = document.getElementById('restaurant-picture');

    const sourceSmall = document.createElement('source');
    sourceSmall.media = "(max-width:319px)";
    sourceSmall.srcset = "img/" + restaurant.id + '-small.jpg';

    picture.append(sourceSmall);

    const sourceMedium = document.createElement('source');
    sourceMedium.media = "(min-width:320px)";
    sourceMedium.srcset = "img/" + restaurant.id + '-medium.jpg';

    picture.append(sourceMedium);

    const sourceLarge = document.createElement('source');
    sourceLarge.media = "(min-width:800px)";
    sourceLarge.srcset = 'img/' + restaurant.id + '-800_large_1x.jpg,' + 'img/' + restaurant.id + '-1600_large_2x.jpg';

    picture.append(sourceLarge);

    const image = document.getElementById('restaurant-img');
    image.className = 'restaurant-img';
    image.src = DBHelper.imageUrlForRestaurant(restaurant);

    image.alt = "Picture of restaurant with name " + restaurant.name;

    picture.append(image);

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = restaurant.cuisine_type;

    // fill operating hours
    if (restaurant.operating_hours) {
        fillRestaurantHoursHTML(restaurant.operating_hours);
    }
    // fill reviews
    fillReviewsHTML(restaurant.reviews);
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
    const hours = document.getElementById('restaurant-hours');

    if(hours.getElementsByTagName('tr').length > 0) {
        return;
    }

    for (let key in operatingHours) {
        const row = document.createElement('tr');

        const day = document.createElement('td');
        day.innerHTML = key;
        row.appendChild(day);

        const time = document.createElement('td');
        time.innerHTML = operatingHours[key];
        row.appendChild(time);

        hours.appendChild(row);
    }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
    const container = document.getElementById('reviews-container');

    if(container.getElementsByTagName('h3').length > 0) {
        return;
    }

    const title = document.createElement('h3');
    title.innerHTML = 'Reviews';
    container.appendChild(title);

    if (!reviews) {
        const noReviews = document.createElement('p');
        noReviews.innerHTML = 'No reviews yet!';
        container.appendChild(noReviews);
        return;
    }
    const ul = document.getElementById('reviews-list');
    ul.setAttribute("aria-labelledby", title.innerHTML);
    reviews.forEach(review => {
        ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
    const li = document.createElement('li');
    const name = document.createElement('p');
    name.innerHTML = review.name;
    li.appendChild(name);

    const date = document.createElement('p');
    date.innerHTML = review.date;
    li.appendChild(date);

    const rating = document.createElement('p');
    rating.innerHTML = `Rating: ${review.rating}`;
    li.appendChild(rating);

    const comments = document.createElement('p');
    comments.innerHTML = review.comments;
    li.appendChild(comments);

    return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
    const breadcrumb = document.getElementById('breadcrumb');
    const li = document.createElement('li');
    li.innerHTML = restaurant.name;
    breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
    if (!url)
        url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
        results = regex.exec(url);
    if (!results)
        return null;
    if (!results[2])
        return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
