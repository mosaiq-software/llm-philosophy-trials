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
                tokens_used : 6,
                highlights : []
            },
            {
                role : 1,
                content : "That is a very intricate and difficult to answer question!",
                tokens_used : 11,
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
                tokens_used : 5,
                highlights : []
            },
            {
                role : 1,
                content : "My day is going fairly well, how about you?",
                tokens_used : 11,
                highlights : []
            },
            {
                role : 0,
                content : "That is great to hear! Can you help me with a math question?",
                tokens_used : 15,
                highlights : []
            },
            {
                role : 1,
                content : "I would love to help you with a question, send me the problem and we can work through it together.",
                tokens_used : 22,
                highlights : [
                    { starting_index : 0, ending_index : 15, comment : "Used the word 'love' over 'like'" },
                    { starting_index : 30, ending_index : 40, comment : null }
                ]
            }
        ]
    }
]