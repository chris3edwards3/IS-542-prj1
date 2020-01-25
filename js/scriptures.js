/*=================================================================
 * File:   scriptures.js
 * AUTHOR: Stephen W. Liddle, re-created by Chris Edwards
 * DATE:   Winter 2020
 *
 * DESCRIPTION:  Front-end JavaScript code for The Scriptures, Mapped.
 *               IS 542, Winter 2020, BYU.
 */

const Scriptures = (function () {
  "use strict";

  /*---------------------------------------------------------------
  *           CONSTANTS
  */

  /*---------------------------------------------------------------
  *           PRIVATE VARIABLES
  */
  let books;
  let volumes;

  /*---------------------------------------------------------------
  *           PRIVATE METHOD DECLARATIONS
  */
  let ajax;
  let cacheBooks;
  let init;

  /*---------------------------------------------------------------
  *           PRIVATE METHODS
  */
  ajax = function (url, successCallback, failureCallback) {
    let request = new XMLHttpRequest();

    request.open('GET', url, true);

    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        // Success!
        let data = JSON.parse(request.responseText);

        if (typeof successCallback === "function") {
          successCallback(data);
        }
      } else {
        // We reached our target server, but it returned an error
        if (typeof failureCallback === "function") {
          failureCallback(request);
        }
      }
    };

    request.onerror = failureCallback;
    request.send();
  };

  cacheBooks = function (callback) {
    volumes.forEach(volume => {
      let volumeBooks = [];
      let bookId = volume.minBookId;

      while (bookId <= volume.maxBookId) {
        volumeBooks.push(books[bookId]);
        bookId += 1;
      }

      volume.books = volumeBooks;
    });

    if (typeof callback === "function") {
      callback();
    }
  };

  init = function (callback) {
    let booksLoaded = false;
    let volumesLoaded = false;

    ajax("https://scriptures.byu.edu/mapscrip/model/books.php",
      data => {
        books = data;
        booksLoaded = true;

        if (volumesLoaded) {
          cacheBooks(callback);
        }
      }
    );

    ajax("https://scriptures.byu.edu/mapscrip/model/volumes.php",
      data => {
        volumes = data;
        volumesLoaded = true;

        if (booksLoaded) {
          cacheBooks(callback);
        }
      }
    );
  };

  /*---------------------------------------------------------------
  *           PUBLIC API
  */

  return {
    init: init
  };
}());
