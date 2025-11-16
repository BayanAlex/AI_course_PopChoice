import requests
from bs4 import BeautifulSoup
import json
import re

URL = "https://www.imdb.com/chart/top/"
HEADERS = {"Accept-Language": "en-US,en;q=0.5", "User-Agent": "Mozilla/5.0"}
OUTPUT_FILE = "imdb_top250.txt"

def get_movie_details(url):
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()  # Raise an error for bad status codes
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err} - URL: {url}")
        return None
    except requests.exceptions.ConnectionError as conn_err:
        print(f"Connection error occurred: {conn_err} - URL: {url}")
        return None
    except requests.exceptions.Timeout as timeout_err:
        print(f"Timeout error occurred: {timeout_err} - URL: {url}")
        return None
    except requests.exceptions.RequestException as req_err:
        print(f"Request error occurred: {req_err} - URL: {url}")
        return None
    
    soup = BeautifulSoup(response.text, "html.parser")

    try:
        name = soup.find("h1").text.strip()
    except:
        name = "N/A"

    try:
        year_ul = soup.find("ul", class_="sc-16bda17f-3")
        if year_ul:
            first_li = year_ul.find("li")
            if first_li:
                year_link = first_li.find("a")
                year = year_link.text.strip() if year_link else "N/A"
            else:
                year = "N/A"
        else:
            year = "N/A"
    except:
        year = "N/A"

    try:
        year_ul = soup.find("ul", class_="sc-16bda17f-3")
        if year_ul:
            li_items = year_ul.find_all("li")
            if len(li_items) >= 3:
                duration = li_items[2].text.strip()
            else:
                duration = "N/A"
        else:
            duration = "N/A"
    except:
        duration = "N/A"

    try:
        rating = soup.find("span", class_="sc-4dc495c1-1").text.strip()
    except:
        rating = "N/A"

    try:
        genres_div = soup.find("div", class_="sc-bf30a0e-5")
        if genres_div:
            div_items = genres_div.find_all("div", recursive=False)
            if len(div_items) >= 2:
                second_div = div_items[1]
                genre_links = second_div.find_all("a")
                genre_list = []
                for link in genre_links:
                    span = link.find("span")
                    if span:
                        genre_list.append(span.text.strip())
                genres = ", ".join(genre_list) if genre_list else "N/A"
            else:
                genres = "N/A"
        else:
            genres = "N/A"
    except:
        genres = "N/A"

    try:
        description = soup.find("span", {"data-testid": "plot-xl"}).text.strip()
    except:
        description = "N/A"

    try:
        cast_section = soup.find("section", {"data-testid": "title-cast"})
        if cast_section:
            cast_links = cast_section.find_all("a", class_="sc-10bde568-1")
            cast_list = [link.text.strip() for link in cast_links if link.text.strip()]
            cast = ", ".join(cast_list) if cast_list else "N/A"
        else:
            cast = "N/A"
    except:
        cast = "N/A"

    try:
        cast_section = soup.find("section", {"data-testid": "title-cast"})
        if cast_section:
            character_spans = cast_section.find_all("span", class_="sc-10bde568-4")
            character_list = [span.text.strip() for span in character_spans if span.text.strip()]
            characters = ", ".join(character_list) if character_list else "N/A"
        else:
            characters = "N/A"
    except:
        characters = "N/A"

    return {
        "Name": name,
        "Year": year,
        "Duration": duration,
        "Rating": rating,
        "Genres": genres,
        "Cast": cast,
        "Characters": characters,
        "Description": description
    }

def main():
    print(f"\n{'='*60}")
    print(f"Fetching IMDb Top 250 movies...")
    print(f"{'='*60}")
    
    try:
        response = requests.get(URL, headers=HEADERS, timeout=10)
        response.raise_for_status()
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred while fetching top 250 list: {http_err}")
        return
    except requests.exceptions.ConnectionError as conn_err:
        print(f"Connection error occurred while fetching top 250 list: {conn_err}")
        return
    except requests.exceptions.Timeout as timeout_err:
        print(f"Timeout error occurred while fetching top 250 list: {timeout_err}")
        return
    except requests.exceptions.RequestException as req_err:
        print(f"Request error occurred while fetching top 250 list: {req_err}")
        return
    
    # Extract data from __NEXT_DATA__ JSON embedded in the page
    next_data_match = re.search(r'<script id="__NEXT_DATA__" type="application/json">({.*?})</script>', response.text, re.DOTALL)
    if not next_data_match:
        print("ERROR: Could not find __NEXT_DATA__ in the page")
        return
    
    try:
        next_data = json.loads(next_data_match.group(1))
    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse JSON data: {e}")
        return
    
    # Navigate to the chart data
    try:
        chart_data = next_data['props']['pageProps']['pageData']['chartTitles']['edges']
        print(f"Found {len(chart_data)} movies in the data")
    except KeyError as e:
        print(f"ERROR: Could not find chart data in JSON: {e}")
        return
    
    result = []
    for i, edge in enumerate(chart_data, start=1):
        movie_data = edge['node']
        
        # Get the movie URL for detailed info
        movie_id = movie_data.get('id')
        if movie_id:
            movie_url = f"https://www.imdb.com/title/{movie_id}/"
            details = get_movie_details(movie_url)
            if details:
                result.append(details)
                print(f"Fetched #{i}: {details['Name']}")
            else:
                print(f"Skipping movie #{i} due to error")
        else:
            print(f"Skipping movie #{i} - no ID found")

    # Write all results to the file (overwrite mode)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for movie in result:
            f.write(
                f"Name: {movie['Name']}\n"
                f"Year: {movie['Year']}\n"
                f"Duration: {movie['Duration']}\n"
                f"Rating: {movie['Rating']}\n"
                f"Genres: {movie['Genres']}\n"
                f"Cast: {movie['Cast']}\n"
                f"Characters: {movie['Characters']}\n"
                f"Description: {movie['Description']}\n\n"
            )

    print(f"\n{'='*60}")
    print(f"Successfully saved {len(result)} movies to {OUTPUT_FILE}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
