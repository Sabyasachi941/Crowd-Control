package cc;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import java.util.List;
import java.util.Collection;

@Entity
public class Venue {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;
    private String email;
    private String password;
    private Integer capacity;

    @OneToMany(mappedBy = "venue")
    private List<Timestamp> timestamps;
    //list is not ordered

    public Integer getId() { return id;}

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {this.email = email; }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {this.password = password; }

    /*public void addTimestamp(Timestamp timestamp) {
        if (!getTimestamps().contains(timestamp)) {
            getTimestamps().add(timestamp);
            if (timestamp.getVenue() != null) {
                timestamp.getVenue().getTimestamps().remove(timestamp);
            }
            timestamp.setVenue(this);
        }
    }*/

    public void setTimestamps(List<Timestamp> timestamps) {
        this.timestamps = timestamps;
    }

    public Collection<Timestamp> getTimestamps() {
        return timestamps;
    }

}


