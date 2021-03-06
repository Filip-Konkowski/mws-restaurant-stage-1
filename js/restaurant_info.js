let restaurant;
var map;
const URL_localhost = 'http://localhost:1337/';

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
        DBHelper.fetchRestaurantById(id, (error, restaurant) => {
            self.restaurant = restaurant;

            if (!restaurant) {
                console.error(error);
                return;
            }
            fillRestaurantHTML();
            // callback(null, restaurant)
        });
    }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
    const name = document.getElementById('restaurant-name');
    if(name.innerHTML !== '') {
        return;
    }
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

    const favoriteButton = document.getElementById('favorite-button')
    favoriteButton.dataset.opinion = restaurant.is_favorite
    if(restaurant.is_favorite == 'true') {
        favoriteButton.style.backgroundColor = '#c70000';
        favoriteButton.innerHTML = 'Your favorite';
        favoriteButton.dataset.opinion = restaurant.is_favorite;
    } else {
        favoriteButton.style.backgroundColor = '#005b00';
        favoriteButton.innerHTML = 'Save as favorite';
        favoriteButton.dataset.opinion = restaurant.is_favorite;
    }

    // fill reviews
    fetch(URL_localhost + 'reviews/?restaurant_id=' + restaurant.id,
        {
            mathod: 'GET'
        }).then(response => {
            response.json().then(data => {
                data.forEach(item => {
                    let date = new Date(item.createdAt);
                    item.createdAt = date.toUTCString()
                });
                fillReviewsHTML(data);
            });
        }).catch(error => console.error('Error review fetch GET request: ', error))
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
    ul.setAttribute("aria-labelledby", 'reviews-list');
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
    date.innerHTML = review.createdAt;
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

navigator.serviceWorker.ready.then(function (swRegistration) {

    let form = document.querySelector('#submit-review');
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        let dataReview = {
            "restaurant_id": self.restaurant.id,
            "name": document.getElementById('reviewer-name').value,
            "rating": document.getElementById('rating').value,
            "comments": document.getElementById('comment').value
        };

        let outbox = 'outbox';
        idb.open('mws-outbox', 1).then(db => {
            let tx = db.transaction(outbox, "readwrite");
            let objectStore = tx.objectStore(outbox);
            objectStore.add(dataReview);

            return tx.complete;
        }).then(() => {
            return swRegistration.sync.register('sync').then(() => {
                location.reload();
            });
        }).catch(error => console.error(error));
    })

    let favorite = document.querySelector('#favorite-button');
    favorite.addEventListener('click', function (event) {
        let opinion = JSON.parse(favorite.dataset.opinion);
        opinion = !opinion;
        let favoriteSelected = {
            'restaurantId': self.restaurant.id,
            'opinion': opinion
        };

        let outboxFavorite = 'outbox-favorite';
        idb.open('mws-outbox', 1).then(db => {
            let tx = db.transaction(outboxFavorite, "readwrite");
            let objectStore = tx.objectStore(outboxFavorite);
            objectStore.add(favoriteSelected);

            return tx.complete;
        }).then(() => {
            return swRegistration.sync.register('sync-favorite').then(() => {
                if(favorite.dataset.opinion !== "true") {
                    favorite.style.backgroundColor = '#c70000';
                    favorite.innerHTML = 'Your favorite';
                    favorite.dataset.opinion = opinion.toString();
                } else {
                    favorite.style.backgroundColor = '#005b00';
                    favorite.innerHTML = 'Save as favorite';
                    favorite.dataset.opinion = opinion.toString();
                }
            });
        }).catch(error => console.error(error));
    })
});

