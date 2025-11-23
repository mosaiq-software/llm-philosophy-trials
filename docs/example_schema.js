// 'role' can be either 0 or 1, 0 corresponding to a message from the user, and 1 corresponding to a message from the model
// the 'highlights' array represents any text of the message highlighted by the user as interesting, with an optional comment being added
chats = [
    {
        model_id : 2,
        pretty_name: "Model A",
        messages: [
            {
                role : 0,
                content : "What is the meaning of life?",
                highlights : null
            },
            {
                role : 1,
                content : "That is a very intricate and difficult to answer question!",
                highlights : [
                    { starting_index : 15, ending_index : 24, comment : "I love the use of the word 'intricate'"}
                ]
            }
        ]
    },
    {
        model_id : 5,
        pretty_name: "Model C",
        messages: [
            {
                role : 0,
                content : "How is your day going?",
                highlights : null
            },
            {
                role : 1,
                content : "My day is going fairly well, how about you?",
                highlights : null
            },
            {
                role : 0,
                content : "That is great to hear! Can you help me with a math question?",
                highlights : null
            },
            {
                role : 1,
                content : "I would love to help you with a question, send me the problem and we can work through it together.",
                highlights : [
                    { starting_index : 0, ending_index : 15, comment : "Used the word 'love' over 'like'" },
                    { starting_index : 30, ending_index : 40, comment : null }
                ]
            }
        ]
    }
]