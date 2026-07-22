## Below is a list of things left to implement or fix, in no particular order of importance; crossed-out entries are completed

- ~~Index Saudi Arabia source docuemnt (found in the backend repo)~~

    - ~~Store text chunks and traffic signs in database~~
    - ~~Enable Saudi for all modes from the frontend~~
    - Some signs were not picked up by the automatic extraction process (all of pages 122, 125, 127-130, and distance indicator for trains on page 123), not enough time to do manually
    - ~~Sign image quality is very low; they may be labelled wrong and have inaccurate retireval, testing needed~~
    - ~~Signs in part 4 don't have their full context stored~~
    - ~~Remove duplicate signs~~

- Test all modes with Oman and Saudi Arabia

- Test Ask Salama with table retrieval

- Add follow up questions/build gold QA dataset for Oman

- Translate follow up questions when the UI language is Arabic

- ~~Parse tables from Qatar and UAE~~

    - ~~Qatar pages: 56, 228-230, 233-236~~
    - ~~Saudi pages: 22, 27, 34, 79, 99~~
    - ~~UAE pages: 21-35, 58, 94, 153*, 158-160*, 162*~~
    - ~~*Table is an image with no selectable text~~

- ~~Replace remaining hard-coded strings~~

    - ~~Country name in dropdown and Ask Salama input placeholder~~

- Adjust system prompt sent to Fanar for sign explanation 

    - Fanar hallucinates when there isn't a lot of context for a specific sign (doesn't always happen)
    - System prompt may be too strict, but making it less strict results in hallucinations as well
    - Below is an example of when the sign has no context

    ![](images/identify-the-sign-no-context.png)

- Fanar is much worse at the decision stage of "Describe the Sign" than gpt (see image above) since it doesn't see the actual signs in question, just the descriptions and the user's prompt

    - Might have to switch back to gpt for this

    ![](images/describe-the-sign-fatal.png)

- Hard-coded text for when no sign is found is not translated into Arabic

    ![](images/english-text-hard-coded.png)

- Buttons in source pages window are not mirrored when in Arabic

- Fanar is sometimes non-deterministic

    - For the first example, the correct source page was listed as the top source; Fanar understood what DUI was but didn't retrieve the answer

    - There may be some sort of cache for Fanar that allowed it to answer the question correctly the second time

    - Both questions were the first prompt in different chats

    ![](images/dui-fine-fail.png)

    ![](images/dui-fine-success.png)

- Johanne suggested that we add other non-sign images to the database to help with Fanar's illustration such as lane markings, right of way diagrams, etc.

- ~~Some signs in the UAE document have their context in multiple pages, but only the context on the same page as the sign is stored~~

    - ~~Page 59: Conventional Cruise Control~~
    - ~~Page 61: Lane Support Systems~~
    - ~~Page 62: Forward Collision Mitigation~~

- ~~Translate the rest of the UI texts and verify all translations~~

    - ~~Country always shows as Qatar in both Arabic and English in the sources page~~

- Sometimes similar questions don't return similar answers or retrieval, possibly a problem with the embedding model?

    - The first example didn't have the correct source in the list of retrieved sources, while the second one had the correct source as #1 in the list

        ![](images/similar-questions-fail.png)

        ![](images/similar-questions-success.png)

- Accidentally deleted the paragraph under "Other Distractions" on page 69 of the UAE handbook from the database (not very important, but worth logging)