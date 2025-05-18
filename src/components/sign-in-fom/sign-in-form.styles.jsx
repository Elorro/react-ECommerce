import styled from "styled-components";

export const SignInContainer = styled.div `
    display: flex;
    flex-direction: column;
    width: 380px;

    h2 {
        margin: 10px 0;
    }
`

export const ButtonsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 20px;

  button {
    flex: 0 1 auto;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
  }
`;