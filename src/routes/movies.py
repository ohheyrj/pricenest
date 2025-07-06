"""
Movie search routes and functionality.
"""

import csv
import io
import requests
from flask import Blueprint, request, jsonify
from src.services.movie_search import search_apple_movies
from src.database.connection import get_db_connection

movies_bp = Blueprint("movies", __name__, url_prefix="/api/movies")


def check_for_duplicate_item(
    cursor, category_id, category_type, title, director=None, year=None, author=None
):
    """
    Check if an item with similar details already exists in the database.
    Returns (is_duplicate, existing_item_data) tuple.
    """
    try:
        # Normalize input data
        title_norm = title.strip().lower() if title else None
        director_norm = director.strip().lower() if director else None
        author_norm = author.strip().lower() if author else None

        if not title_norm:
            return False, None

        # Different matching strategies based on category type
        if category_type == "movies":
            # For movies, try multiple matching strategies in order of specificity

            # Strategy 1: title + year (most specific)
            if year and year > 1900:  # Reasonable year check
                cursor.execute(
                    """
                    SELECT id, name, title, director, year, url, price
                    FROM items
                    WHERE category_id = ?
                      AND LOWER(TRIM(title)) = ?
                      AND year = ?
                """,
                    (category_id, title_norm, year),
                )
                result = cursor.fetchone()
                if result:
                    return True, {
                        "id": result[0],
                        "name": result[1],
                        "title": result[2],
                        "director": result[3],
                        "year": result[4],
                        "url": result[5],
                        "price": result[6],
                        "match_reason": f"Same title and year ({year})",
                    }

            # Strategy 2: title + director
            if director_norm:
                cursor.execute(
                    """
                    SELECT id, name, title, director, year, url, price
                    FROM items
                    WHERE category_id = ?
                      AND LOWER(TRIM(title)) = ?
                      AND LOWER(TRIM(director)) = ?
                """,
                    (category_id, title_norm, director_norm),
                )
                result = cursor.fetchone()
                if result:
                    return True, {
                        "id": result[0],
                        "name": result[1],
                        "title": result[2],
                        "director": result[3],
                        "year": result[4],
                        "url": result[5],
                        "price": result[6],
                        "match_reason": f"Same title and director ({director})",
                    }

            # Strategy 3: title only (less specific, but still useful)
            cursor.execute(
                """
                SELECT id, name, title, director, year, url, price
                FROM items
                WHERE category_id = ?
                  AND LOWER(TRIM(title)) = ?
            """,
                (category_id, title_norm),
            )
            result = cursor.fetchone()
            if result:
                return True, {
                    "id": result[0],
                    "name": result[1],
                    "title": result[2],
                    "director": result[3],
                    "year": result[4],
                    "url": result[5],
                    "price": result[6],
                    "match_reason": "Same title (but different details)",
                }

        elif category_type == "books":
            # For books, title + author is the most reliable match
            if author_norm:
                cursor.execute(
                    """
                    SELECT id, name, title, author, url, price
                    FROM items
                    WHERE category_id = ?
                      AND LOWER(TRIM(title)) = ?
                      AND LOWER(TRIM(author)) = ?
                """,
                    (category_id, title_norm, author_norm),
                )
                result = cursor.fetchone()
                if result:
                    return True, {
                        "id": result[0],
                        "name": result[1],
                        "title": result[2],
                        "author": result[3],
                        "url": result[4],
                        "price": result[5],
                        "match_reason": f"Same title and author ({author})",
                    }

            # Fallback: title only for books
            cursor.execute(
                """
                SELECT id, name, title, author, url, price
                FROM items
                WHERE category_id = ?
                  AND LOWER(TRIM(title)) = ?
            """,
                (category_id, title_norm),
            )
            result = cursor.fetchone()
            if result:
                return True, {
                    "id": result[0],
                    "name": result[1],
                    "title": result[2],
                    "author": result[3],
                    "url": result[4],
                    "price": result[5],
                    "match_reason": "Same title (but potentially different author)",
                }

        else:  # general category
            # For general items, check by name (which might contain the title)
            cursor.execute(
                """
                SELECT id, name, url, price
                FROM items
                WHERE category_id = ?
                  AND LOWER(TRIM(name)) = ?
            """,
                (category_id, title_norm),
            )
            result = cursor.fetchone()
            if result:
                return True, {
                    "id": result[0],
                    "name": result[1],
                    "url": result[2],
                    "price": result[3],
                    "match_reason": "Same name",
                }

        return False, None

    except Exception as e:
        print(f"Error checking for duplicate: {e}")
        return False, None


@movies_bp.route("/search", methods=["POST"])
def search_movies():
    """Search for movies using Apple Store API."""
    try:
        data = request.get_json()
        query = data.get("query", "").strip()

        if not query:
            return jsonify({"error": "Query parameter is required"}), 400

        # Search Apple Store for movies
        results = search_apple_movies(query)

        return jsonify(results)

    except Exception as e:
        print(f"Movie search error: {e}")
        return jsonify({"error": "Failed to search for movies"}), 500


@movies_bp.route("/preview-csv", methods=["POST"])
def preview_csv():
    """Preview CSV import - parse and search without importing to database."""
    try:
        # Check if file was uploaded
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        # Get category ID from form data
        category_id = request.form.get("category_id")
        if not category_id:
            return jsonify({"error": "Category ID is required"}), 400

        try:
            category_id = int(category_id)
        except ValueError:
            return jsonify({"error": "Invalid category ID"}), 400

        # Verify category exists and is a movie category
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, type, name FROM categories WHERE id = ?", (category_id,)
        )
        category_row = cursor.fetchone()

        if not category_row:
            conn.close()
            return jsonify({"error": "Category not found"}), 404

        category_type = category_row[1]
        category_name = category_row[2]

        if category_type != "movies":
            conn.close()
            return jsonify({"error": 'Category must be of type "movies"'}), 400

        # Parse CSV file
        try:
            # Read file content and decode
            file_content = file.read().decode("utf-8")
            csv_reader = csv.DictReader(io.StringIO(file_content))

            # Validate CSV headers
            required_headers = ["title"]
            headers = csv_reader.fieldnames
            if not headers or "title" not in headers:
                return (
                    jsonify(
                        {
                            "error": 'CSV must have at least a "title" column. Optional: "director", "year"'
                        }
                    ),
                    400,
                )

            movies_to_preview = list(csv_reader)

        except Exception as e:
            return jsonify({"error": f"Failed to parse CSV file: {str(e)}"}), 400

        if not movies_to_preview:
            return jsonify({"error": "CSV file is empty or has no valid rows"}), 400

        # Process each movie - search but don't import
        preview_results = []

        for i, row in enumerate(movies_to_preview):
            try:
                title = row.get("title", "").strip()
                director = row.get("director", "").strip() or None
                year_str = row.get("year", "").strip()
                year = None

                if not title:
                    preview_results.append(
                        {
                            "row_index": i,
                            "csv_data": {
                                "title": title,
                                "director": director,
                                "year": year_str,
                            },
                            "status": "error",
                            "error": "Missing title",
                            "search_results": [],
                        }
                    )
                    continue

                # Parse year if provided
                if year_str:
                    try:
                        year = int(year_str)
                    except ValueError:
                        pass  # Ignore invalid year, we'll note it

                # Check for duplicate items in the database
                is_duplicate, existing_item = check_for_duplicate_item(
                    cursor, category_id, category_type, title, director, year
                )

                if is_duplicate:
                    # Item already exists - mark as duplicate
                    status = "duplicate"
                    best_match = None
                    search_results = {"movies": []}
                    error_msg = None
                else:
                    # No duplicate found - proceed with Apple Store search
                    search_results = search_apple_movies(title)

                    # Determine status based on search results
                    if (
                        search_results.get("movies")
                        and len(search_results["movies"]) > 0
                    ):
                        status = "found"
                        best_match = search_results["movies"][
                            0
                        ]  # First result is best match
                        error_msg = None
                    elif search_results.get("rate_limited"):
                        status = "pending"
                        best_match = None
                        error_msg = search_results.get("error")
                    else:
                        status = "not_found"
                        best_match = None
                        error_msg = (
                            search_results.get("error")
                            or f"No results found for '{title}'"
                        )

                # Log debug info for CSV preview (only if not duplicate)
                if not is_duplicate and search_results.get("debug"):
                    debug_info = search_results["debug"]
                    print(f"🔍 DEBUG CSV Import - Row {i+1} ({title}):")
                    print(f"  Original query: {debug_info['original_query']}")
                    print(f"  Search strategies: {debug_info['search_strategies']}")
                    for api_call in debug_info["api_calls"]:
                        print(f"  API Call: {api_call['search_term']}")
                        print(f"    URL: {api_call['url']}")
                        print(f"    Status: {api_call['status_code']}")
                        print(f"    Results: {api_call['results_count']}")
                        if api_call["error"]:
                            print(f"    Error: {api_call['error']}")

                # Build result object
                result_obj = {
                    "row_index": i,
                    "csv_data": {"title": title, "director": director, "year": year},
                    "status": status,
                    "error": error_msg,
                    "best_match": best_match,
                    "search_results": search_results.get("movies", []),
                    "debug": search_results.get("debug") if not is_duplicate else None,
                }

                # Add duplicate information if applicable
                if is_duplicate:
                    result_obj["existing_item"] = existing_item
                    result_obj["duplicate_reason"] = existing_item.get(
                        "match_reason", "Duplicate found"
                    )

                preview_results.append(result_obj)

            except Exception as e:
                preview_results.append(
                    {
                        "row_index": i,
                        "csv_data": {
                            "title": row.get("title", ""),
                            "director": row.get("director", ""),
                            "year": row.get("year", ""),
                        },
                        "status": "error",
                        "error": str(e),
                        "search_results": [],
                    }
                )

        # Add pending searches to database at the end
        for result in preview_results:
            if result["status"] == "pending":
                csv_data = result["csv_data"]
                cursor.execute(
                    """
                    INSERT INTO pending_movie_searches (category_id, title, director, year, csv_row_data)
                    VALUES (?, ?, ?, ?, ?)
                """,
                    (category_id,
                     csv_data["title"],
                        csv_data["director"],
                        csv_data["year"],
                        requests.utils.quote(f"{csv_data['title']}|{csv_data['director'] or ''}|{csv_data['year'] or ''}"),
                     ),
                )

        conn.commit()
        conn.close()

        # Calculate summary stats
        total_movies = len(preview_results)
        found_movies = len([r for r in preview_results if r["status"] == "found"])
        not_found_movies = len(
            [r for r in preview_results if r["status"] == "not_found"]
        )
        pending_movies = len([r for r in preview_results if r["status"] == "pending"])
        error_movies = len([r for r in preview_results if r["status"] == "error"])
        duplicate_movies = len(
            [r for r in preview_results if r["status"] == "duplicate"]
        )

        # Convert preview results to the format expected by the front-end
        formatted_results = []
        for result in preview_results:
            formatted_result = {
                "title": result["csv_data"]["title"],
                "director": result["csv_data"]["director"],
                "year": result["csv_data"]["year"],
                "price": None,
                "url": None,
                "status": result["status"],
                "error": result.get("error"),
                "artwork": None,
            }

            # If we have a best match, use its data
            if result.get("best_match"):
                movie = result["best_match"]
                formatted_result.update(
                    {
                        "title": movie.get("title", result["csv_data"]["title"]),
                        "director": movie.get(
                            "director", result["csv_data"]["director"]
                        ),
                        "year": movie.get("year", result["csv_data"]["year"]),
                        "price": movie.get("price"),
                        "url": movie.get("url"),
                        "artwork": movie.get("artworkUrl")
                        or movie.get("imageUrl")
                        or movie.get("artwork"),
                        "currency": movie.get("currency", "GBP"),
                    }
                )

            # Add duplicate information if applicable
            if result["status"] == "duplicate" and result.get("existing_item"):
                existing = result["existing_item"]
                formatted_result.update(
                    {
                        "title": existing.get("title", result["csv_data"]["title"]),
                        "director": existing.get(
                            "director", result["csv_data"]["director"]
                        ),
                        "year": existing.get("year", result["csv_data"]["year"]),
                        "price": existing.get("price"),
                        "url": existing.get("url"),
                    }
                )

            formatted_results.append(formatted_result)

        return jsonify(
            {
                "success": True,
                "category_id": category_id,
                "category_name": category_name,
                "results": formatted_results,  # This matches what the front-end expects
                "summary": {
                    "total": total_movies,
                    "found": found_movies,
                    "not_found": not_found_movies,
                    "pending": pending_movies,
                    "errors": error_movies,
                    "duplicates": duplicate_movies,
                },
            }
        )

    except Exception as e:
        print(f"CSV preview error: {e}")
        return jsonify({"error": "Failed to preview CSV file"}), 500


@movies_bp.route("/import-confirmed", methods=["POST"])
def import_confirmed():
    """Import movies from confirmed preview data."""
    try:
        data = request.get_json()
        category_id = data.get("category_id")
        confirmed_movies = data.get("confirmed_movies", [])

        if not category_id:
            return jsonify({"error": "Category ID is required"}), 400

        if not confirmed_movies:
            return jsonify({"error": "No movies to import"}), 400

        # Verify category exists and is a movie category
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, type, name FROM categories WHERE id = ?", (category_id,)
        )
        category_row = cursor.fetchone()

        if not category_row:
            conn.close()
            return jsonify({"error": "Category not found"}), 404

        category_type = category_row[1]
        category_name = category_row[2]

        if category_type != "movies":
            conn.close()
            return jsonify({"error": 'Category must be of type "movies"'}), 400

        # Import confirmed movies
        results = {
            "total": len(confirmed_movies),
            "imported": 0,
            "failed": 0,
            "errors": [],
            "imported_movies": [],
        }

        for i, movie_data in enumerate(confirmed_movies):
            try:
                # Create display name
                display_name = (
                    movie_data.get("name")
                    or f"{movie_data['title']} ({movie_data.get('year', 'Unknown')})"
                )

                # Ensure required fields have defaults
                title = movie_data.get("title", "Unknown Title")
                director = movie_data.get("director") or "Unknown Director"
                year = movie_data.get("year")
                url = movie_data.get(
                    "url",
                    f"https://tv.apple.com/search?term={requests.utils.quote(title)}",
                )
                price = movie_data.get("price", 0.0)

                # Insert into database
                cursor.execute(
                    """
                    INSERT INTO items (category_id, name, title, director, year, url, price, bought)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
                """,
                    (category_id, display_name, title, director, year, url, price),
                )

                results["imported"] += 1
                results["imported_movies"].append(
                    {
                        "title": title,
                        "director": director,
                        "year": year,
                        "price": price,
                        "priceSource": movie_data.get("priceSource", "apple"),
                    }
                )

            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"Movie {i+1}: {str(e)}")
                print(f"Error importing movie {i+1}: {e}")
                print(f"Movie data: {movie_data}")
                continue

        conn.commit()
        conn.close()

        return jsonify(
            {
                "success": True,
                "message": f'Imported {results["imported"]} movies into "{category_name}" category',
                "imported_count": results["imported"],
                "results": results,
            })

    except Exception as e:
        print(f"Confirmed import error: {e}")
        return jsonify({"error": "Failed to import confirmed movies"}), 500


@movies_bp.route("/process-pending", methods=["POST"])
def process_pending():
    """Process pending movie searches (background job)."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get up to 5 pending searches (stay under rate limit)
        cursor.execute(
            """
            SELECT id, category_id, title, director, year, csv_row_data, retry_count
            FROM pending_movie_searches
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT 5
        """
        )
        pending_searches = cursor.fetchall()

        if not pending_searches:
            conn.close()
            return jsonify(
                {"message": "No pending searches to process", "processed": 0}
            )

        processed = 0
        imported = 0
        failed = 0

        for search in pending_searches:
            (
                search_id,
                category_id,
                title,
                director,
                year,
                csv_row_data,
                retry_count,
            ) = search

            try:
                # Update last_attempted and increment retry count
                cursor.execute(
                    """
                    UPDATE pending_movie_searches
                    SET last_attempted = CURRENT_TIMESTAMP, retry_count = retry_count + 1
                    WHERE id = ?
                """,
                    (search_id,),
                )

                # Try searching again
                search_results = search_apple_movies(title)

                if search_results.get("movies") and len(search_results["movies"]) > 0:
                    # Found movie - import it and mark as completed
                    movie = search_results["movies"][0]
                    display_name = (
                        movie.get("name")
                        or f"{movie['title']} ({movie.get('year', 'Unknown')})"
                    )

                    cursor.execute(
                        """
                        INSERT INTO items (category_id, name, title, director, year, url, price, bought)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
                    """,
                        (
                            category_id,
                            display_name,
                            movie["title"],
                            movie.get("director") or director,
                            movie.get("year") or year,
                            movie["url"],
                            movie["price"],
                        ),
                    )

                    # Mark as completed
                    cursor.execute(
                        """
                        UPDATE pending_movie_searches
                        SET status = 'completed'
                        WHERE id = ?
                    """,
                        (search_id,),
                    )

                    imported += 1
                    print(f"✅ Imported pending movie: {title}")

                elif search_results.get("rate_limited"):
                    # Still rate limited - stop processing
                    print(f"🚦 Still rate limited, stopping batch processing")
                    break

                elif retry_count >= 3:
                    # Max retries reached - mark as failed
                    cursor.execute(
                        """
                        UPDATE pending_movie_searches
                        SET status = 'failed'
                        WHERE id = ?
                    """,
                        (search_id,),
                    )
                    failed += 1
                    print(f"❌ Failed to find movie after 3 retries: {title}")

                else:
                    # Still not found but haven't hit max retries
                    print(f"🔍 Movie still not found, will retry: {title}")

                processed += 1

            except Exception as e:
                print(f"Error processing pending search {search_id}: {e}")
                continue

        conn.commit()
        conn.close()

        return jsonify(
            {
                "success": True,
                "message": f"Processed {processed} pending searches",
                "processed": processed,
                "imported": imported,
                "failed": failed,
            }
        )

    except Exception as e:
        print(f"Process pending error: {e}")
        return jsonify({"error": "Failed to process pending searches"}), 500


@movies_bp.route("/add-manual-movie", methods=["POST"])
def add_manual_movie():
    """Add a manually entered movie to a category."""
    try:
        data = request.get_json()
        category_id = data.get("category_id")
        title = data.get("title", "").strip()
        director = data.get("director", "").strip() or None
        year = data.get("year")
        url = data.get("url", "").strip() or None
        price = data.get("price")

        if not category_id or not title:
            return (
                jsonify({"error": "Missing required fields: category_id and title"}),
                400,
            )

        try:
            category_id = int(category_id)
            if price is not None:
                price = float(price)
            if year:
                year = int(year)
        except ValueError:
            return (
                jsonify(
                    {"error": "Invalid data types for category_id, year, or price"}
                ),
                400,
            )

        # Verify category exists and is a movie category
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, type, name FROM categories WHERE id = ?", (category_id,)
        )
        category_row = cursor.fetchone()

        if not category_row:
            conn.close()
            return jsonify({"error": "Category not found"}), 404

        if category_row[1] != "movies":
            conn.close()
            return jsonify({"error": 'Category must be of type "movies"'}), 400

        # Create display name
        display_name = f"{title} ({year})" if year else title

        # Set defaults for optional fields
        if not url:
            url = f"https://tv.apple.com/search?term={requests.utils.quote(title)}"
        if price is None:
            price = 0.00
        if not director:
            director = "Unknown Director"

        # Insert into database
        cursor.execute(
            """
            INSERT INTO items (category_id, name, title, director, year, url, price, bought)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        """,
            (category_id, display_name, title, director, year, url, price),
        )

        conn.commit()
        conn.close()

        return jsonify(
            {
                "success": True,
                "message": f'Added "{title}" manually to category',
                "movie": {
                    "title": title,
                    "director": director,
                    "year": year,
                    "price": price,
                    "url": url,
                    "priceSource": "manual_entry",
                },
            }
        )

    except Exception as e:
        print(f"Manual movie add error: {e}")
        return jsonify({"error": "Failed to add movie manually"}), 500


@movies_bp.route("/import-csv", methods=["POST"])
def import_csv():
    """Import movies from CSV file and add them to a category."""
    try:
        # Check if file was uploaded
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        # Get category ID from form data
        category_id = request.form.get("category_id")
        if not category_id:
            return jsonify({"error": "Category ID is required"}), 400

        # Get import options
        skip_not_found = request.form.get("skip_not_found", "true").lower() == "true"

        try:
            category_id = int(category_id)
        except ValueError:
            return jsonify({"error": "Invalid category ID"}), 400

        # Verify category exists and is a movie category
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, type, name FROM categories WHERE id = ?", (category_id,)
        )
        category_row = cursor.fetchone()

        if not category_row:
            conn.close()
            return jsonify({"error": "Category not found"}), 404

        category_type = category_row[1]
        category_name = category_row[2]

        if category_type != "movies":
            conn.close()
            return jsonify({"error": 'Category must be of type "movies"'}), 400

        # Parse CSV file
        try:
            # Read file content and decode
            file_content = file.read().decode("utf-8")
            csv_reader = csv.DictReader(io.StringIO(file_content))

            # Validate CSV headers
            required_headers = ["title"]
            headers = csv_reader.fieldnames
            if not headers or "title" not in headers:
                return (
                    jsonify(
                        {
                            "error": 'CSV must have at least a "title" column. Optional: "director", "year"'
                        }
                    ),
                    400,
                )

            movies_to_import = list(csv_reader)

        except Exception as e:
            return jsonify({"error": f"Failed to parse CSV file: {str(e)}"}), 400

        if not movies_to_import:
            return jsonify({"error": "CSV file is empty or has no valid rows"}), 400

        # Process each movie
        results = {
            "total": len(movies_to_import),
            "imported": 0,
            "failed": 0,
            "errors": [],
            "imported_movies": [],
        }

        for i, row in enumerate(movies_to_import):
            try:
                title = row.get("title", "").strip()
                director = row.get("director", "").strip() or None
                year_str = row.get("year", "").strip()
                year = None

                if not title:
                    results["failed"] += 1
                    results["errors"].append(f"Row {i+1}: Missing title")
                    continue

                # Parse year if provided
                if year_str:
                    try:
                        year = int(year_str)
                    except ValueError:
                        results["errors"].append(
                            f"Row {i+1}: Invalid year '{year_str}', ignoring"
                        )

                # Search for movie on Apple Store
                search_results = search_apple_movies(title)

                if (
                    not search_results.get("movies")
                    or len(search_results["movies"]) == 0
                ):
                    if skip_not_found:
                        results["failed"] += 1
                        error_msg = search_results.get(
                            "error", f"No results found for '{title}'"
                        )
                        results["errors"].append(f"Row {i+1}: {error_msg}")
                        continue
                    else:
                        # Create a placeholder entry with estimated pricing
                        movie = {
                            "title": title,
                            "director": director or "Unknown Director",
                            "year": year,
                            "name": f"{title} ({year})" if year else title,
                            "price": 7.99,  # Default estimated price
                            "url": f"https://tv.apple.com/search?term={requests.utils.quote(title)}",
                            "priceSource": "manual_entry",
                        }
                else:
                    # Use the first (best) result from Apple Store
                    movie = search_results["movies"][0]

                # Create display name
                display_name = (
                    movie.get("name")
                    or f"{movie['title']} ({movie.get('year', 'Unknown')})"
                )

                # Insert into database
                cursor.execute(
                    """
                    INSERT INTO items (category_id, name, title, director, year, url, price, bought)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
                """,
                    (
                        category_id,
                        display_name,
                        movie["title"],
                        movie.get("director")
                        or director,  # Use CSV director if Apple doesn't have one
                        movie.get("year")
                        or year,  # Use CSV year if Apple doesn't have one
                        movie["url"],
                        movie["price"],
                    ),
                )

                results["imported"] += 1
                results["imported_movies"].append(
                    {
                        "title": movie["title"],
                        "director": movie.get("director"),
                        "year": movie.get("year"),
                        "price": movie["price"],
                        "priceSource": movie.get("priceSource", "apple"),
                    }
                )

            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"Row {i+1}: {str(e)}")
                continue

        conn.commit()
        conn.close()

        return jsonify(
            {
                "success": True,
                "message": f'Imported {results["imported"]} movies into "{category_name}" category',
                "results": results,
            })

    except Exception as e:
        print(f"CSV import error: {e}")
        return jsonify({"error": "Failed to import CSV file"}), 500
