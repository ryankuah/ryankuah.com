export const useRouter = () => ({
  push: () => {},
  replace: () => {},
  back: () => {},
});
export const useParams = () => ({ quizid: "local-example" });
export default function Link({ children, href, ...props }) {
  return (
    <a {...props} href="#" onClick={(event) => event.preventDefault()}>
      {children}
    </a>
  );
}
export const UserButton = () => null;
