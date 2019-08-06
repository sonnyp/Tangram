const {
  FlowBoxChild,
  ScrolledWindow,
  Viewport,
  FlowBox,
  Align,
  Image,
  Button,
  PositionType,
  ReliefStyle,
} = imports.gi.Gtk;

const { services } = imports.serviceManager;

this.buildHomePage = function buildHomePage({ onAddService }) {
  const scrolledWindow = new ScrolledWindow();
  const viewPort = new Viewport();
  scrolledWindow.add(viewPort);
  const flowBox = new FlowBox({
    homogeneous: true,
    halign: Align.CENTER,
    valign: Align.START,
    max_children_per_line: 10,
  });
  viewPort.add(flowBox);

  services.forEach(service => {
    const flowBoxChild = new FlowBoxChild({
      width_request: 200,
      height_request: 200,
      can_focus: false,
    });

    const image = new Image({
      resource: service.icon,
    });

    const button = new Button({
      width_request: 200,
      height_request: 200,
      halign: Align.CENTER,
      valign: Align.CENTER,
      image,
      always_show_image: true,
      label: service.name,
      image_position: PositionType.TOP,
      relief: ReliefStyle.NONE,
    });
    // TODO get_data/set_data does not work in gjs
    // open issue?
    button.service_id = service.id;
    button.connect("clicked", onButtonclicked);

    flowBoxChild.add(button);
    flowBox.add(flowBoxChild);
  });

  function onButtonclicked({ service_id }) {
    const service = services.find(({ id }) => id === service_id);
    if (!service) return;
    onAddService(service).catch(logError);
  }

  return scrolledWindow;
};
