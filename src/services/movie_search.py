"""
Movie search service for integrating with Apple Store and other APIs.
"""

import requests
from typing import Dict, List, Any
import re


def search_apple_movies(query: str) -> Dict[str, Any]:
    """Search Apple Store for movies with multiple search strategies."""
    debug_info = {
        'original_query': query,
        'api_calls': [],
        'search_strategies': []
    }
    
    try:
        # Try different search variations
        search_queries = [
            query.strip(),  # Original query
            query.strip().replace(' ', '+'),  # URL encoded spaces
            query.strip().split('(')[0].strip(),  # Remove year/parentheses if any
        ]
        
        # Remove duplicates while preserving order
        search_queries = list(dict.fromkeys(search_queries))
        debug_info['search_strategies'] = search_queries
        
        for search_query in search_queries:
            if not search_query:
                continue
                
            # Use iTunes/Apple Store Search API
            url = "https://itunes.apple.com/search"
            params = {
                'term': search_query,
                'media': 'movie',
                'country': 'GB',  # UK store
                'limit': 15,  # Increased limit for better results
                'entity': 'movie'
            }
            
            # Build full URL for debugging
            full_url = f"{url}?{'&'.join([f'{k}={requests.utils.quote(str(v))}' for k, v in params.items()])}"
            
            print(f"🔍 DEBUG: Searching Apple Store for '{search_query}'")
            print(f"🌐 DEBUG: API URL: {full_url}")
            
            api_call_info = {
                'search_term': search_query,
                'url': full_url,
                'status_code': None,
                'results_count': 0,
                'error': None
            }
            
            try:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
                }
                response = requests.get(url, params=params, headers=headers, timeout=10)
                api_call_info['status_code'] = response.status_code
                
                print(f"📡 DEBUG: Status Code: {response.status_code}")
                
                if not response.ok:
                    api_call_info['error'] = f"HTTP {response.status_code}"
                    print(f"❌ DEBUG: HTTP Error {response.status_code}")
                    debug_info['api_calls'].append(api_call_info)
                    
                    # If we hit rate limiting (403), stop trying and return rate limit info
                    if response.status_code == 403:
                        print(f"🚦 DEBUG: Rate limit detected, marking as pending")
                        return {
                            'movies': [],
                            'error': f'Rate limited by Apple Store API (20 calls/minute limit)',
                            'rate_limited': True,
                            'debug': debug_info
                        }
                    
                    continue  # Try next search variation
                
                data = response.json()
                results_count = len(data.get('results', []))
                api_call_info['results_count'] = results_count
                
                print(f"✅ DEBUG: Found {results_count} results")
                
                if data.get('results') and len(data['results']) > 0:
                    debug_info['api_calls'].append(api_call_info)
                    # Found results, process them
                    break
                    
            except requests.exceptions.Timeout:
                api_call_info['error'] = 'Timeout'
                print(f"⏱️ DEBUG: Request timeout")
            except requests.exceptions.RequestException as e:
                api_call_info['error'] = str(e)
                print(f"🚫 DEBUG: Request error: {e}")
            
            debug_info['api_calls'].append(api_call_info)
            
        else:
            # No results found with any search variation
            print(f"🔍 DEBUG: No results found after {len(search_queries)} search attempts")
            return {
                'movies': [], 
                'error': f'No Apple Store results found for "{query}"',
                'debug': debug_info
            }
        
        movies = []
        for item in data['results'][:10]:
            title = item.get('trackName')
            if not title:
                continue
            
            # Extract movie details
            director = item.get('artistName', 'Unknown Director')
            year = extract_year_from_release_date(item.get('releaseDate', ''))
            genre = item.get('primaryGenreName', 'Unknown')
            
            # Get pricing information
            price_info = get_apple_pricing(item)
            
            # Create Apple Store URL
            apple_url = item.get('trackViewUrl', f"https://tv.apple.com/search?term={requests.utils.quote(title)}")
            
            # Create display name
            display_name = f"{title} ({year})" if year else title
            
            movie = {
                'title': title,
                'director': director,
                'year': year,
                'genre': genre,
                'name': display_name,
                'price': price_info['price'],
                'url': apple_url,
                'priceSource': price_info['source'],
                'artwork': item.get('artworkUrl100', ''),
                'description': item.get('longDescription', item.get('shortDescription', ''))
            }
            movies.append(movie)
        
        # Sort movies: HD purchase first, then standard purchase, collection, rental, then by price
        def get_price_priority(price_source):
            if 'hd_purchase' in price_source:
                return 0  # Highest priority
            elif 'apple_purchase' in price_source:
                return 1
            elif 'collection' in price_source:
                return 2
            elif 'rental' in price_source:
                return 3  # Lowest priority
            else:
                return 4  # Estimated/unknown
        
        movies.sort(key=lambda movie: (
            get_price_priority(movie['priceSource']),
            movie['price'] if movie['price'] else 999
        ))
        
        print(f"🎬 DEBUG: Returning {len(movies)} processed movies")
        
        return {
            'movies': movies,
            'debug': debug_info
        }
        
    except Exception as e:
        print(f"💥 DEBUG: Apple movie search error: {e}")
        debug_info['api_calls'].append({
            'error': f'Exception: {str(e)}',
            'search_term': query,
            'url': 'N/A',
            'status_code': None,
            'results_count': 0
        })
        
        return {
            'movies': [],
            'error': f'Search failed: {str(e)}',
            'debug': debug_info
        }


def get_apple_pricing(item: Dict) -> Dict[str, Any]:
    """Extract pricing information from Apple Store item."""
    # Prioritize purchase prices over rental prices
    hd_purchase_price = item.get('trackHdPrice')
    purchase_price = item.get('trackPrice') 
    collection_price = item.get('collectionPrice')
    rental_price = item.get('trackRentalPrice')
    
    # Priority order: HD purchase > standard purchase > collection > rental
    if hd_purchase_price and hd_purchase_price > 0:
        return {
            'price': float(hd_purchase_price),
            'source': 'apple_hd_purchase'
        }
    elif purchase_price and purchase_price > 0:
        return {
            'price': float(purchase_price),
            'source': 'apple_purchase'
        }
    elif collection_price and collection_price > 0:
        return {
            'price': float(collection_price),
            'source': 'apple_collection'
        }
    elif rental_price and rental_price > 0:
        return {
            'price': float(rental_price),
            'source': 'apple_rental'
        }
    else:
        # Generate estimated price based on movie characteristics
        return {
            'price': generate_estimated_movie_price(item),
            'source': 'estimated'
        }


def generate_estimated_movie_price(item: Dict) -> float:
    """Generate estimated movie pricing."""
    # Base pricing for movies
    base_rental = 3.49
    base_purchase = 9.99
    
    # Adjust based on release date (newer movies cost more)
    year = extract_year_from_release_date(item.get('releaseDate', ''))
    current_year = 2025
    
    if year and year >= current_year - 1:  # Very recent
        base_rental = 4.99
        base_purchase = 13.99
    elif year and year >= current_year - 3:  # Recent
        base_rental = 3.99
        base_purchase = 11.99
    
    # Return rental price as it's more common
    import random
    variation = (random.random() - 0.5) * 1.0  # ±0.50
    return round(max(2.99, base_rental + variation), 2)


def extract_year_from_release_date(release_date: str) -> int:
    """Extract year from release date string."""
    if not release_date:
        return None
    
    # Try to extract 4-digit year
    year_match = re.search(r'(\d{4})', release_date)
    if year_match:
        return int(year_match.group(1))
    
    return None


def get_mock_movie_results(query: str) -> Dict[str, Any]:
    """Generate mock movie search results - only used for frontend testing."""
    # Create a more realistic mock result using the original query
    mock_movie = {
        'title': query,  # Use the original title, not "Sample Movie"
        'director': 'Unknown Director',
        'year': 2020,
        'genre': 'Drama',
        'name': f"{query} (2020)",
        'price': 7.99,
        'url': f"https://tv.apple.com/search?term={requests.utils.quote(query)}",
        'priceSource': 'estimated',
        'artwork': '',
        'description': f'Movie information for "{query}" not available from Apple Store'
    }
    
    return {'movies': [mock_movie]}


def search_tmdb_movies(query: str) -> Dict[str, Any]:
    """Search The Movie Database (TMDB) for additional movie info."""
    # This could be used to get additional metadata
    # For now, we'll rely on Apple Store data
    pass