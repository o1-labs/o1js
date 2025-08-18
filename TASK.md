# `o1js` MEMORY LEAK INVESTIGATION TASK

!!Always ensure `DEV.md` is up-to-date with your current state as your progress through these tasks!!

## Summary of Task and Scope

`o1js` currently has a very annoying memory leak.  The issue is as follows: the WASM linear memory for the process grows after each proof creation step.  This means if you prove in a loop (for example, when doing a recursive proof; or when acting as a centralized proving execution environment), you will eventually run out of memory, and the WASM process will crash.  This is very, very bad, as it cannot be recovered from -- a crashed WASM process stops responding completely.  _Our only choice is to fix the memory leak._

You job is the _find out what_ is leaking memory.  Your job is _not_ to fix the memory leak.  That will be given to another engineer.  To do this, we will modify the rust bindings layer to log to the console the following:

1. Every time a WASM object of type `T` is allocated, we write to the console (on a single line):
    0. an '@' character
    1. "ALLOCATE"
    2. its size in bytes (i.e., for a vector of 100 elements, each 64 bytes this would be ~6400 bytes (slightly more because of some constant overhead))
    3. the file and line number it was allocated at
    4. its type `T`
    5. an ID for that allocation, globally unique and sequentially generated starting at `0`, which will be stored with the object
2. Every time a WASM  object of type `T` is dropped, we write to the console (on a single line):
    0. an '@' character
    1. "DROP"
    2. its size in bytes
    3. its type `T`
    4. the same ID that was assigned to it during allocation (this is why we store the ID with the object)

Remember to use the JavaScript console through the WASM bindings, _not_ `println!` and friends.

## Step 0

Write a simple `o1js` benchmark that proves some trivial (but non-empty!) circuit in a loop 10 times.  Use the garbage collector after each iteration.  Print the size of the WASM linear memory after each iteration.  Ensure this test works, and works well, as we will use it in the final steps to determine if we've made an impact or not.  Be ruthless in your self-criticism.

Write any interesting findings to `STEP_0.md`.

## Step 1

Explore the WASM bindings layer first.  Get a feel for how everything is organized.

We need to learn of all of the types of WASM objects that can be allocated.  Search the WASM bindings layer for definitions of `struct`s and `enum`s and `type` aliases of things that are allocated.  Compile the list of all of these into the file `TYPES_TO_LOG.md`, including any relevant information about those types for the task at hand.  (Some relevant information might include: whether the types are generic; whether they already have a `Drop` trait implemented for them; etc.)

For all your other interesting findings, write them to `STEP_1.md`.  Use this file to track your progress as you complete this task.

## Step 2

For each of the types `T` listed in `TYPES_TO_LOG.md`, implement the logging strategy described above.  You will probably need to add new fields to `struct`s and `enum`s (to track their IDs).  Be careful about getting the size in bytes correct, as we will use this later to prioritize which leaks to tackle first!  Make sure the logging messages are as uniform as possible, as you will be parsing them later.  Feel free to use JSON, if you'd like -- just make sure each log is on a single line, and ensure the initial '@' exists on the line.

Make sure you do this in a _thread-safe way_ because our code is _highly parallel_.  In particular, you need to be sure that the ID generation and printing to console is protected by a `Mutex` of some sort.  Be ruthless in your self-criticism for this part.

Track your progress in, and write all interesting findngs to `STEP_2.md`.  Include in this file detailed documentation of the log format you used -- it should be detailed enough that someone could write a parser for it from your description.

## Step 3

Using the format you decided on in Step 2 (and detailed in `STEP_2.md`), write a parser for the logs.  You will eventually use this parser to match "ALLOCATE" to "DROP" messages by ID.  Discard any line not starting with a '@' character.

Your program should read from a given file, or stdin if no file is given on the command line.

Perform some sanity checking here: you will want to collect every ALLOCATE and every DROP into two separate `Vec`s, and then create a `Vec` of ALLOCATEs that are missing a DROP.  Make sure every ID occurs only once in the first two lists.  Depending on when you log, the IDs may not be printed sequentially -- this is okay.  Finally, create an association list of `(name_of_T, total_size_in_bytes_of_non_dropped)` pairs from this data.  Sort it in descending order of `total_size_in_bytes_of_non_dropped`, and then pretty-print it.

Sanity check this final list against the data you gathered in Step 0: is even slightly `sum(total_size_in_bytes_of_non_dropped)` larger than the memory leak we observe?  Is it much smaller?  These would indicate problems with our methodology, so be thorough in your analysis.  Be ruthless in your self-criticism.

Run the parser on the output of the Step 0 program you wrote, _making sure_ you only analyze lines that start with '@', otherwise you will have parse errors.

Write your findings and observations, and document your progress, in the file `STEP_3.md`.  Include in here the pretty-printed output of your program.

## Step 4

Reread all the results in `STEP_X.md` for `X \in {0, 1, 2, 3}`.  Summarize in a final `SUMMARY.md` the following:

1. The types `T` which are the largest contributors to the memory leak, and how much each leaks.
2. Whether there is perfect dropping of any of the types.  This is a good thing!
3. Whether you think the data can be trusted, given the findings in each `STEP_X.md` and the internal consistency of the data.  Be ruthless in your criticism of the methodology, and suggest ways to improve if you can.