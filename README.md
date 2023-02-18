# E621-Tag-Categories

You might want to go to [the app](https://sasquire.github.io/projects/E621-Tag-Categories/app) to use this tool.

This is a strange project by me in an attempt to revolutionize how implications on e621 are written. Will this go anywhere? Unlikely. It uses simple set operations as an attempt to build the complex web of implications. The ultimate goal is to have this web be able to auto-generate tagging checklists so no image will go under-tagged.

## Overview of grammar

This program makes use of [lagodiuk's early parser](https://github.com/lagodiuk/earley-parser-js). For those not in the know, that is a parsing algorithm for [context free grammars](https://en.wikipedia.org/wiki/Context-free_grammar).

A brief overview of the file structure without delving into the grammar specifics. It was made to be intuitive.

```
# Imports optional
import <set> from file
import <set> from file
...

# Set literals
<words> = { tag gat gta four }
<numbers> = { 1 2 3 four }

# Set operations
# https://en.wikipedia.org/wiki/Set_(mathematics)#Basic_operations
<set1> = <words> UNION <numbers> # { tag gat gta 1 2 3 four }
<set2> = <words> INTERSECTION <numbers> # { four }
<set3> = <words> MINUS <numbers> # { tag gat gta }

# https://en.wikipedia.org/wiki/Cartesian_product
<set4> = <words> CROSS <numbers>
# {
#     tag1  tag2  tag3  tagfour
#     gat1  gat2  gat3  gatfour
#     gta1  gta2  gta3  gtafour
#    four1 four2 four3 fourfour
# }

# Any time you have a named-set you can use a set literal instead
# <numbers> MINUS { 3 four five } == { 1 2 }

# Exports mandatory - Why would you make a file if you exported nothing?
# Regular exports are only visible to whatever file includes them 
export <set>
export <set>
...

# Global exports are visible to the final output
global export <set>
global export <set>
...

# Regular and global exports can be mixed and matched in any way
```

## License

As usual, this is licensed under the [Unlicense](https://unlicense.org/). 